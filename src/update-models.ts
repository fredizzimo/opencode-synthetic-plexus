import type { OpenCodeModelConfig, SyntheticModel } from "./types.js";

let verbose = false;

export function setVerbose(value: boolean): void {
  verbose = value;
}

function log(message: string): void {
  if (verbose) {
    console.log(`[synthetic-plexus] ${message}`);
  }
}

function parsePrice(priceStr: string): number {
  const value = parseFloat(priceStr.replace("$", ""));
  return value * 1_000_000;
}

function convertSyntheticModelToOpenCode(model: SyntheticModel, modelOptions?: Record<string, { options?: Record<string, unknown> }>): OpenCodeModelConfig {
  const modelConfig: OpenCodeModelConfig = {};

  const parts = model.id.split("/");
  modelConfig.name = parts[parts.length - 1];

  if (model.supported_features?.includes("tools")) {
    modelConfig.tool_call = true;
  }
  if (model.supported_features?.includes("reasoning")) {
    modelConfig.reasoning = true;
  }

  modelConfig.temperature = true;

  const limit: { context?: number; output?: number } = {};
  if (model.context_length) {
    limit.context = model.context_length;
  }
  if (model.max_output_length) {
    limit.output = model.max_output_length;
  }
  if (limit.context || limit.output) {
    modelConfig.limit = limit;
  }

  const modalities: { input?: string[]; output?: string[] } = {};
  if (model.input_modalities?.length > 0) {
    modalities.input = model.input_modalities;
  }
  if (model.output_modalities?.length > 0) {
    modalities.output = model.output_modalities;
  }
  if (modalities.input || modalities.output) {
    modelConfig.modalities = modalities;
  }

  const cost: { input?: number; output?: number; cache_read?: number } = {};
  cost.input = parsePrice(model.pricing.prompt);
  cost.output = parsePrice(model.pricing.completion);
  if (model.pricing.input_cache_reads) {
    cost.cache_read = parsePrice(model.pricing.input_cache_reads);
  }
  modelConfig.cost = cost;

  const aliasName = parts[parts.length - 1];
  if (modelOptions?.[aliasName]?.options) {
    modelConfig.options = modelOptions[aliasName].options;
  }

  return modelConfig;
}

export function buildProviderConfig(
  models: SyntheticModel[],
  plexusUrl: string,
  providerName: string,
  modelOptions?: Record<string, { options?: Record<string, unknown> }>
): {
  npm: string;
  name: string;
  options: { baseURL: string };
  models: Record<string, OpenCodeModelConfig>;
} {
  const modelsConfig: Record<string, OpenCodeModelConfig> = {};

  for (const model of models) {
    const aliasName = model.id.split("/").pop() || model.id;
    modelsConfig[aliasName] = convertSyntheticModelToOpenCode(model, modelOptions);
  }

  return {
    npm: "@ai-sdk/openai-compatible",
    name: providerName,
    options: { baseURL: `${plexusUrl}/v1` },
    models: modelsConfig,
  };
}

export function updateOpenCodeConfig(
  config: Record<string, unknown>,
  models: SyntheticModel[],
  plexusUrl: string,
  providerName: string,
  modelOptions?: Record<string, { options?: Record<string, unknown> }>
): Record<string, unknown> {
  const providerConfig = buildProviderConfig(models, plexusUrl, providerName, modelOptions);

  const provider = (config.provider as Record<string, unknown>) || {};
  provider[providerName] = providerConfig as unknown;
  config.provider = provider;

  log(`Updated config with ${models.length} models`);
  return config;
}
