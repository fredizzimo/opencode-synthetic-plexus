import type { PlexusAlias, PlexusModelConfig, PlexusTarget, PlexusProvider, SyntheticModel } from "./types.js";
import { parsePrice, FETCH_TIMEOUT_MS, buildModelAliases, SYNTHETIC_API_BASE_URL } from "./synthetic.js";
import { validatePlexusAliasesResponse, validatePlexusProviderResponse } from "./validate.js";
import { info } from "./log.js";

function buildSyntheticProviderModels(models: SyntheticModel[]): Record<string, PlexusModelConfig> {
  const result: Record<string, PlexusModelConfig> = {};
  for (const model of models) {
    const cached = model.pricing.input_cache_reads ? parsePrice(model.pricing.input_cache_reads) : undefined;
    result[model.id] = {
      pricing: {
        source: "simple",
        input: parsePrice(model.pricing.prompt),
        output: parsePrice(model.pricing.completion),
        ...(cached !== undefined && { cached }),
      },
      access_via: [],
    };
  }
  return result;
}

function buildSyntheticAlias(model: SyntheticModel, existingAlias?: PlexusAlias): PlexusAlias {
  const targets = existingAlias?.targets || [];
  const nonSyntheticTargets = targets.filter((t) => t.provider !== "synthetic");
  const syntheticTarget: PlexusTarget = {
    provider: "synthetic",
    model: model.id,
    enabled: true,
  };

  return {
    targets: [syntheticTarget, ...nonSyntheticTargets],
    priority: existingAlias?.priority ?? "selector",
    use_image_fallthrough: existingAlias?.use_image_fallthrough ?? false,
    selector: existingAlias?.selector ?? "in_order",
    additional_aliases: existingAlias?.additional_aliases ?? [],
  };
}

async function fetchWithAuth(url: string, adminKey: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      "x-admin-key": adminKey,
      ...(options.headers as Record<string, string>),
    };
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPlexusAliases(plexusUrl: string, adminKey: string): Promise<Record<string, PlexusAlias>> {
  info("Fetching current Plexus aliases...");
  const response = await fetchWithAuth(`${plexusUrl}/v0/management/aliases`, adminKey);
  if (!response.ok) {
    throw new Error(`Failed to fetch Plexus aliases: ${response.status} ${response.statusText}`);
  }
  const raw = await response.json();
  const aliases = validatePlexusAliasesResponse(raw);
  info(`Found ${Object.keys(aliases).length} existing aliases`);
  return aliases;
}

export async function fetchPlexusProvider(
  plexusUrl: string,
  providerId: string,
  adminKey: string,
): Promise<PlexusProvider | null> {
  const response = await fetchWithAuth(
    `${plexusUrl}/v0/management/providers/${encodeURIComponent(providerId)}`,
    adminKey,
  );
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch Plexus provider: ${response.status} ${response.statusText}`);
  }
  const raw = await response.json();
  return validatePlexusProviderResponse(raw) as PlexusProvider;
}

export async function savePlexusProvider(
  plexusUrl: string,
  providerId: string,
  config: PlexusProvider,
  adminKey: string,
): Promise<void> {
  const response = await fetchWithAuth(
    `${plexusUrl}/v0/management/providers/${encodeURIComponent(providerId)}`,
    adminKey,
    {
      method: "PUT",
      body: JSON.stringify(config),
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save provider '${providerId}': ${response.status} ${response.statusText}\n${errorText}`);
  }
}

export async function savePlexusAlias(
  plexusUrl: string,
  aliasId: string,
  config: PlexusAlias,
  adminKey: string,
): Promise<void> {
  const response = await fetchWithAuth(`${plexusUrl}/v0/management/aliases/${encodeURIComponent(aliasId)}`, adminKey, {
    method: "PUT",
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save alias '${aliasId}': ${response.status} ${response.statusText}\n${errorText}`);
  }
}

async function deletePlexusAlias(plexusUrl: string, aliasId: string, adminKey: string): Promise<void> {
  const response = await fetchWithAuth(`${plexusUrl}/v0/management/aliases/${encodeURIComponent(aliasId)}`, adminKey, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete alias '${aliasId}': ${response.status} ${response.statusText}\n${errorText}`);
  }
}

export interface SyncResult {
  count: number;
  models: SyntheticModel[];
}

const ALIAS_CONCURRENCY = 5;

async function allSettledWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];
  let running = 0;
  let index = 0;
  let resolveWait: (() => void) | null = null;

  function tryNext() {
    while (running < concurrency && index < items.length) {
      const i = index++;
      running++;
      fn(items[i])
        .then(
          () => {
            results[i] = { status: "fulfilled", value: undefined };
          },
          (err: unknown) => {
            results[i] = { status: "rejected", reason: err };
          },
        )
        .finally(() => {
          running--;
          if (resolveWait) {
            resolveWait();
            resolveWait = null;
          }
        });
    }
    if (index >= items.length && running === 0 && resolveWait) {
      resolveWait();
      resolveWait = null;
    }
  }

  while (index < items.length || running > 0) {
    tryNext();
    if (running > 0 && (running >= concurrency || index >= items.length)) {
      await new Promise<void>((r) => {
        resolveWait = r;
      });
    }
  }

  return results;
}

export async function syncPlexusModels(
  plexusUrl: string,
  adminKey: string,
  syntheticModels: SyntheticModel[],
): Promise<SyncResult> {
  info("Starting model sync...");

  const existingAliases = await fetchPlexusAliases(plexusUrl, adminKey);

  const existingProvider = await fetchPlexusProvider(plexusUrl, "synthetic", adminKey);
  const syntheticProvider: PlexusProvider = {
    ...existingProvider,
    api_base_url: existingProvider?.api_base_url || { chat: SYNTHETIC_API_BASE_URL },
    display_name: existingProvider?.display_name || "Synthetic",
    enabled: existingProvider?.enabled !== false,
    models: buildSyntheticProviderModels(syntheticModels),
  };

  await savePlexusProvider(plexusUrl, "synthetic", syntheticProvider, adminKey);

  const aliasMap = buildModelAliases(syntheticModels.map((m) => m.id));

  const results = await allSettledWithConcurrency(
    syntheticModels,
    async (model) => {
      const aliasName = aliasMap.get(model.id)!;
      const existingAlias = existingAliases[aliasName];
      const aliasConfig = buildSyntheticAlias(model, existingAlias);
      await savePlexusAlias(plexusUrl, aliasName, aliasConfig, adminKey);
    },
    ALIAS_CONCURRENCY,
  );

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) {
    for (const f of failures) {
      info(`Warning: alias save failed: ${f.reason}`);
    }
    info(`Sync completed with ${failures.length} alias save failure(s) out of ${syntheticModels.length} models`);
  } else {
    info(`Sync completed successfully (${syntheticModels.length} models)`);
  }

  const currentModelIds = new Set(syntheticModels.map((m) => m.id));
  const savedAliasNames = new Set(aliasMap.values());
  const aliasesToDelete: string[] = [];
  const aliasesToUpdate: { name: string; config: PlexusAlias }[] = [];

  for (const [aliasName, alias] of Object.entries(existingAliases)) {
    if (savedAliasNames.has(aliasName)) continue;
    const staleTargets = alias.targets.filter((t) => t.provider === "synthetic" && !currentModelIds.has(t.model));
    if (staleTargets.length === 0) continue;
    const remainingTargets = alias.targets.filter(
      (t) => !(t.provider === "synthetic" && !currentModelIds.has(t.model)),
    );
    if (remainingTargets.length === 0) {
      aliasesToDelete.push(aliasName);
    } else {
      aliasesToUpdate.push({ name: aliasName, config: { ...alias, targets: remainingTargets } });
    }
  }

  const cleanupItems: { name: string; action: "delete" | "update"; config?: PlexusAlias }[] = [
    ...aliasesToDelete.map((name) => ({ name, action: "delete" as const })),
    ...aliasesToUpdate.map(({ name, config }) => ({ name, action: "update" as const, config })),
  ];

  if (cleanupItems.length > 0) {
    info(
      `Cleaning up ${cleanupItems.length} stale alias(es) (${aliasesToDelete.length} delete, ${aliasesToUpdate.length} update)...`,
    );
    const cleanupResults = await allSettledWithConcurrency(
      cleanupItems,
      async (item) => {
        if (item.action === "delete") {
          await deletePlexusAlias(plexusUrl, item.name, adminKey);
          info(`Deleted stale alias '${item.name}'`);
        } else {
          await savePlexusAlias(plexusUrl, item.name, item.config!, adminKey);
          info(`Removed stale Synthetic target(s) from alias '${item.name}'`);
        }
      },
      ALIAS_CONCURRENCY,
    );
    const cleanupFailures = cleanupResults.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    for (const f of cleanupFailures) {
      info(`Warning: stale alias cleanup failed: ${f.reason}`);
    }
  }

  return { count: syntheticModels.length, models: syntheticModels };
}
