import type { Plugin, Config } from "@opencode-ai/plugin";
import type { SyntheticModel } from "./types.js";
import { fetchSyntheticModels, setVerbose as setSyntheticVerbose } from "./synthetic.js";
import { syncPlexusModels, setVerbose as setPlexusVerbose } from "./plexus.js";
import { updateOpenCodeConfig, setVerbose as setUpdateVerbose } from "./update-opencode.js";
import { homedir } from "node:os";
import { join } from "node:path";

interface PluginConfig {
  plexusUrl?: string;
  syntheticApiUrl?: string;
  providerName?: string;
  syntheticApiKey?: string;
  plexusAdminKey?: string;
  modelOptions?: Record<string, Record<string, unknown>>;
  verbose?: boolean;
}

const DEFAULT_PLEXUS_URL = "http://localhost:8080";
const DEFAULT_SYNTHETIC_API_URL = "https://api.synthetic.new/openai/v1";
const CONFIG_FILE_NAME = "synthetic-plexus.json";

function substituteEnvVars(value: string): string {
  return value.replace(/\{env:([^}]+)\}/g, (_, varName) => {
    return process.env[varName] || "";
  });
}

function processConfigValues(obj: unknown): unknown {
  if (typeof obj === "string") {
    return substituteEnvVars(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(processConfigValues);
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processConfigValues(value);
    }
    return result;
  }
  return obj;
}

async function loadConfigFile(directory: string): Promise<PluginConfig | null> {
  try {
    const fs = await import("node:fs/promises");
    const configPath = join(directory, CONFIG_FILE_NAME);
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = JSON.parse(content);
    return processConfigValues(parsed) as PluginConfig;
  } catch {
    return null;
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
      const pluginConfig = await getPluginConfig(directory);

      if (!pluginConfig.syntheticApiKey) {
        return;
      }

      setSyntheticVerbose(pluginConfig.verbose ?? false);
      setPlexusVerbose(pluginConfig.verbose ?? false);
      setUpdateVerbose(pluginConfig.verbose ?? false);

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
        if (pluginConfig.verbose) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          await client.app.log({
            body: {
              service: "synthetic-plexus",
              level: "error",
              message: `Failed to sync models: ${errorMessage}`,
            },
          });
        }
      }
    },
  };
};

export default SyntheticPlexusPlugin;
