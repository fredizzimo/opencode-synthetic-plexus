import type { OpenCodeModelConfig, SyntheticModel } from "./types.js";
import { parsePrice, buildModelAliases } from "./synthetic.js";
import { info } from "./log.js";

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && result[key] && typeof result[key] === "object") {
      result[key] = deepMerge(result[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function convertSyntheticModelToOpenCode(model: SyntheticModel, userConfig?: Record<string, unknown>): OpenCodeModelConfig {
  const modelConfig: OpenCodeModelConfig = {};

  const parts = model.id.split("/");
  modelConfig.name = parts[parts.length - 1];

  if (model.supported_features?.includes("tools")) {
    modelConfig.tool_call = true;
  }
  if (model.supported_features?.includes("reasoning")) {
    modelConfig.reasoning = true;
  }

  if (model.supported_sampling_parameters?.includes("temperature")) {
    modelConfig.temperature = true;
  }

  if (model.context_length && model.max_output_length) {
    modelConfig.limit = { context: model.context_length, output: model.max_output_length };
  } else if (model.context_length) {
    modelConfig.limit = { context: model.context_length, output: model.max_output_length ?? 0 };
  }

  if (Array.isArray(model.input_modalities) && model.input_modalities.length > 0
    && Array.isArray(model.output_modalities) && model.output_modalities.length > 0) {
    modelConfig.modalities = { input: model.input_modalities, output: model.output_modalities };
  }

  const cost: { input: number; output: number; cache_read?: number; cache_write?: number } = {
    input: parsePrice(model.pricing.prompt),
    output: parsePrice(model.pricing.completion),
  };
  if (model.pricing.input_cache_reads) {
    cost.cache_read = parsePrice(model.pricing.input_cache_reads);
  }
  if (model.pricing.input_cache_writes) {
    cost.cache_write = parsePrice(model.pricing.input_cache_writes);
  }
  modelConfig.cost = cost;

  if (userConfig) {
    return deepMerge(modelConfig as Record<string, unknown>, userConfig) as OpenCodeModelConfig;
  }

  return modelConfig;
}

export function buildProviderConfig(
  models: SyntheticModel[],
  baseURL: string,
  providerName: string,
  modelOptions?: Record<string, Record<string, unknown>>
): {
  npm: string;
  name: string;
  options: { baseURL: string };
  models: Record<string, OpenCodeModelConfig>;
} {
  const modelsConfig: Record<string, OpenCodeModelConfig> = {};

  const aliasMap = buildModelAliases(models.map(m => m.id));

  for (const model of models) {
    const aliasName = aliasMap.get(model.id)!;
    modelsConfig[aliasName] = convertSyntheticModelToOpenCode(model, modelOptions?.[aliasName]);
  }

  return {
    npm: "@ai-sdk/openai-compatible",
    name: providerName,
    options: { baseURL },
    models: modelsConfig,
  };
}

export function updateOpenCodeConfig(
  config: Record<string, unknown>,
  models: SyntheticModel[],
  baseURL: string,
  providerName: string,
  modelOptions?: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const providerConfig = buildProviderConfig(models, baseURL, providerName, modelOptions);

  const provider = (config.provider as Record<string, unknown>) || {};
  provider[providerName] = providerConfig as unknown;
  config.provider = provider;

  info(`Updated config with ${models.length} models`);
  return config;
}
