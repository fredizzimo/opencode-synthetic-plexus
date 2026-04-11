import type { Plugin, Config } from "@opencode-ai/plugin";
import { syncModels, setVerbose as setSyncVerbose } from "./sync-models.js";
import { updateOpenCodeConfig, setVerbose as setUpdateVerbose } from "./update-models.js";
import { homedir } from "node:os";
import { join } from "node:path";

interface PluginConfig {
  plexusUrl?: string;
  providerName?: string;
  syntheticApiKey?: string;
  plexusAdminKey?: string;
  modelOptions?: Record<string, Record<string, unknown>>;
  syncEnabled?: boolean;
  verbose?: boolean;
}

const DEFAULT_PLEXUS_URL = "http://localhost:8080";
const DEFAULT_PROVIDER_NAME = "synthetic-plexus";
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
    plexusUrl: merged.plexusUrl || process.env.PLEXUS_URL || DEFAULT_PLEXUS_URL,
    providerName: merged.providerName || DEFAULT_PROVIDER_NAME,
    syntheticApiKey: merged.syntheticApiKey || process.env.SYNTHETIC_API_KEY,
    plexusAdminKey: merged.plexusAdminKey || process.env.PLEXUS_ADMIN_KEY,
    modelOptions: merged.modelOptions || {},
    syncEnabled: merged.syncEnabled !== false,
    verbose: merged.verbose ?? false,
  };
}

export const SyntheticPlexusPlugin: Plugin = async ({ client, directory }) => {
  return {
    config: async (config) => {
      const cfg = config as Config & { provider?: Record<string, unknown> };
      const pluginConfig = await getPluginConfig(directory);

      if (!pluginConfig.syncEnabled) {
        return;
      }

      if (!pluginConfig.syntheticApiKey || !pluginConfig.plexusAdminKey) {
        return;
      }

      setSyncVerbose(pluginConfig.verbose ?? false);
      setUpdateVerbose(pluginConfig.verbose ?? false);

      process.env.SYNTHETIC_API_KEY = pluginConfig.syntheticApiKey;
      process.env.PLEXUS_ADMIN_KEY = pluginConfig.plexusAdminKey;

      try {
        const syncResult = await syncModels(pluginConfig.plexusUrl!);

        updateOpenCodeConfig(
          cfg as unknown as Record<string, unknown>,
          syncResult.models,
          pluginConfig.plexusUrl!,
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
