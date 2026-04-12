import type { Plugin, Config } from "@opencode-ai/plugin";
import type { SyntheticModel, PluginConfig } from "./types.js";
import { fetchSyntheticModels } from "./synthetic.js";
import { syncPlexusModels } from "./plexus.js";
import { updateOpenCodeConfig } from "./update-opencode.js";
import { validatePluginConfig } from "./validate.js";
import { setVerbose, error as logError, warn as logWarn } from "./log.js";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_PLEXUS_URL = "http://localhost:8080";
const DEFAULT_SYNTHETIC_API_URL = "https://api.synthetic.new/openai/v1";
const CONFIG_FILE_NAME = "synthetic-plexus.json";

function substituteEnvVars(value: string, missing: Set<string>): string {
  return value.replace(/\{env:([^}]+)\}/g, (_, varName) => {
    const envValue = process.env[varName];
    if (envValue === undefined) {
      missing.add(varName);
      return `{env:${varName}}`;
    }
    return envValue;
  });
}

function processConfigValues(obj: unknown, missing: Set<string>): unknown {
  if (typeof obj === "string") {
    return substituteEnvVars(obj, missing);
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => processConfigValues(v, missing));
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processConfigValues(value, missing);
    }
    return result;
  }
  return obj;
}

async function loadConfigFile(directory: string): Promise<PluginConfig | null> {
  let parsed: unknown;
  try {
    const fs = await import("node:fs/promises");
    const configPath = join(directory, CONFIG_FILE_NAME);
    const content = await fs.readFile(configPath, "utf-8");
    parsed = JSON.parse(content);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    logError(`Failed to load config from ${directory}: ${err instanceof Error ? err.message : String(err)}`);
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
      logError(`Invalid config in ${directory}: ${(err as { issues: unknown[] }).issues.map(String).join(", ")}`);
      return null;
    }
    throw err;
  }
}

async function getPluginConfig(directory: string): Promise<PluginConfig> {
  const globalConfigDir = join(homedir(), ".config", "opencode");
  const projectConfigDir = join(directory, ".opencode");

  const globalConfig = await loadConfigFile(globalConfigDir);
  const projectConfig = await loadConfigFile(projectConfigDir);

  const merged: PluginConfig = {
    ...globalConfig,
    ...projectConfig,
  };

  return {
    plexusUrl: merged.plexusUrl || DEFAULT_PLEXUS_URL,
    syntheticApiUrl: merged.syntheticApiUrl || DEFAULT_SYNTHETIC_API_URL,
    providerName: merged.providerName || (merged.plexusAdminKey ? "synthetic-plexus" : "synthetic"),
    syntheticApiKey: merged.syntheticApiKey,
    plexusAdminKey: merged.plexusAdminKey,
    modelOptions: merged.modelOptions || {},
    verbose: merged.verbose ?? false,
  };
}

export const SyntheticPlexusPlugin: Plugin = async ({ client, directory }) => {
  return {
    config: async (config) => {
      const cfg = config as Config & { provider?: Record<string, unknown> };
      let pluginConfig: PluginConfig;

      try {
        pluginConfig = await getPluginConfig(directory);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Failed to load plugin config: ${errorMessage}`);
        await client.app.log({
          body: {
            service: "synthetic-plexus",
            level: "error",
            message: `Failed to load plugin config: ${errorMessage}`,
          },
        });
        return;
      }

      if (!pluginConfig.syntheticApiKey) {
        logWarn("syntheticApiKey is not configured, skipping model sync");
        return;
      }

      setVerbose(pluginConfig.verbose ?? false);

      try {
        let models: SyntheticModel[];
        let baseURL: string;

        if (pluginConfig.plexusAdminKey) {
          const syntheticModels = await fetchSyntheticModels(pluginConfig.syntheticApiKey!);
          const syncResult = await syncPlexusModels(
            pluginConfig.plexusUrl!,
            pluginConfig.plexusAdminKey,
            syntheticModels
          );
          models = syncResult.models;
          baseURL = `${pluginConfig.plexusUrl!}/v1`;
        } else {
          models = await fetchSyntheticModels(pluginConfig.syntheticApiKey!);
          baseURL = pluginConfig.syntheticApiUrl!;
        }

        updateOpenCodeConfig(
          cfg as unknown as Record<string, unknown>,
          models,
          baseURL,
          pluginConfig.providerName!,
          pluginConfig.modelOptions
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const stackTrace = pluginConfig.verbose && error instanceof Error && error.stack ? `\n${error.stack}` : "";
        logError(`Failed to sync models: ${errorMessage}${stackTrace}`);
        await client.app.log({
          body: {
            service: "synthetic-plexus",
            level: "error",
            message: `Failed to sync models: ${errorMessage}${stackTrace}`,
          },
        });
      }
    },
  };
};

export default SyntheticPlexusPlugin;
