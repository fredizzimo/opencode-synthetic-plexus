import type { Plugin, Config } from "@opencode-ai/plugin";
import type { SyntheticModel, PluginConfig, ResolvedPluginConfig, OpenCodeAppConfig } from "./types.js";
import { fetchSyntheticModels, SYNTHETIC_API_BASE_URL } from "./synthetic.js";
import { syncPlexusModels } from "./plexus.js";
import { updateOpenCodeConfig, deepMerge } from "./update-opencode.js";
import { validatePluginConfig } from "./validate.js";
import { Logger } from "./log.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

const DEFAULT_PLEXUS_URL = "http://localhost:8080";
const DEFAULT_CACHE_DISCOUNT = 80;
const CONFIG_FILE_NAME = "synthetic-plexus.json";

export function substituteEnvVars(
  value: string,
  missing: Set<string>,
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): string {
  return value.replace(/\{env:([^}]+)\}/g, (_, varName) => {
    const envValue = env[varName];
    if (envValue === undefined) {
      missing.add(varName);
      return `{env:${varName}}`;
    }
    return envValue;
  });
}

export function processConfigValues(
  obj: unknown,
  missing: Set<string>,
  env?: Record<string, string | undefined>,
): unknown {
  if (typeof obj === "string") {
    return substituteEnvVars(obj, missing, env ?? (process.env as Record<string, string | undefined>));
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => processConfigValues(v, missing, env));
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processConfigValues(value, missing, env);
    }
    return result;
  }
  return obj;
}

async function loadConfigFile(directory: string, logger: Logger): Promise<PluginConfig | null> {
  let parsed: unknown;
  try {
    const configPath = join(directory, CONFIG_FILE_NAME);
    const content = await readFile(configPath, "utf-8");
    parsed = JSON.parse(content);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    logger.error(`Failed to load config from ${directory}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const missing = new Set<string>();
  const processed = processConfigValues(parsed, missing);

  if (missing.size > 0) {
    const vars = [...missing].join("', '");
    throw new Error(`Environment variable(s) not set: '${vars}'`);
  }

  try {
    return validatePluginConfig(processed) as PluginConfig;
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      logger.error(`Invalid config in ${directory}: ${(err as { issues: unknown[] }).issues.map(String).join(", ")}`);
      return null;
    }
    throw err;
  }
}

async function getPluginConfig(directory: string, logger: Logger): Promise<ResolvedPluginConfig> {
  const globalConfigDir = join(homedir(), ".config", "opencode");
  const projectConfigDir = join(directory, ".opencode");

  const globalConfig = await loadConfigFile(globalConfigDir, logger);
  const projectConfig = await loadConfigFile(projectConfigDir, logger);

  const merged: PluginConfig = {
    ...globalConfig,
    ...projectConfig,
    modelOptions: deepMerge(
      (globalConfig?.modelOptions || {}) as Record<string, unknown>,
      (projectConfig?.modelOptions || {}) as Record<string, unknown>,
    ) as Record<string, Record<string, unknown>>,
  };

  return {
    plexusUrl: merged.plexusUrl || DEFAULT_PLEXUS_URL,
    syntheticApiUrl: merged.syntheticApiUrl || SYNTHETIC_API_BASE_URL,
    providerName: merged.providerName || (merged.plexusAdminKey ? "synthetic-plexus" : "synthetic"),
    syntheticApiKey: merged.syntheticApiKey,
    plexusAdminKey: merged.plexusAdminKey,
    cacheDiscount: merged.cacheDiscount ?? DEFAULT_CACHE_DISCOUNT,
    modelOptions: merged.modelOptions || {},
  };
}

export const SyntheticPlexusPlugin: Plugin = async ({ client, directory }) => {
  return {
    config: async (config) => {
      const cfg = config as Config & OpenCodeAppConfig;
      let pluginConfig: ResolvedPluginConfig;

      const logger = new Logger({
        logFn: (level, message) => {
          client.app
            .log({
              body: {
                service: "synthetic-plexus",
                level,
                message,
              },
            })
            .catch(() => {});
        },
      });

      try {
        pluginConfig = await getPluginConfig(directory, logger);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to load plugin config: ${errorMessage}`);
        return;
      }

      if (!pluginConfig.syntheticApiKey) {
        logger.warn("syntheticApiKey is not configured, skipping model sync");
        return;
      }

      try {
        let models: SyntheticModel[];
        let baseURL: string;

        if (pluginConfig.plexusAdminKey) {
          const syntheticModels = await fetchSyntheticModels(pluginConfig.syntheticApiKey!, undefined, logger);
          const syncResult = await syncPlexusModels(
            pluginConfig.plexusUrl,
            pluginConfig.plexusAdminKey,
            syntheticModels,
            logger,
            pluginConfig.syntheticApiKey,
            pluginConfig.cacheDiscount,
          );
          models = syncResult.models;
          baseURL = `${pluginConfig.plexusUrl}/v1`;
        } else {
          models = await fetchSyntheticModels(pluginConfig.syntheticApiKey!, undefined, logger);
          baseURL = pluginConfig.syntheticApiUrl;
        }

        updateOpenCodeConfig(
          cfg,
          models,
          baseURL,
          pluginConfig.providerName,
          pluginConfig.modelOptions,
          pluginConfig.cacheDiscount,
          logger,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = error instanceof Error && error.stack ? `\n${error.stack}` : "";
        logger.error(`Failed to sync models: ${errorMessage}${stackTrace}`);
      }
    },
  };
};

export default {
  id: "synthetic-plexus",
  server: SyntheticPlexusPlugin,
};
