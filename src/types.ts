export interface SyntheticPricing {
  prompt: string;
  completion: string;
  input_cache_reads?: string;
  input_cache_writes?: string;
}

export interface SyntheticModel {
  provider: "synthetic" | "fireworks" | "together";
  id: string;
  name: string;
  input_modalities: string[];
  output_modalities: string[];
  context_length: number;
  max_output_length: number;
  pricing: SyntheticPricing;
  supported_features: string[];
  openrouter?: { slug: string };
}

export interface PlexusPricing {
  source: string;
  input: number;
  output: number;
}

export interface PlexusModelConfig {
  pricing: PlexusPricing;
  access_via: string[];
}

export interface PlexusTarget {
  provider: string;
  model: string;
  enabled: boolean;
}

export interface PlexusAlias {
  targets: PlexusTarget[];
  selector?: string;
  priority?: string;
  use_image_fallthrough?: boolean;
  additional_aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface PlexusProvider {
  api_base_url?: { chat: string };
  display_name?: string;
  api_key?: string;
  enabled?: boolean;
  disable_cooldown?: boolean;
  models?: Record<string, PlexusModelConfig>;
  [key: string]: unknown;
}

export interface PlexusConfig {
  providers: Record<string, PlexusProvider>;
  models: Record<string, PlexusAlias>;
  keys?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlexusModelData {
  id: string;
  name?: string;
  supported_parameters?: string[];
  context_length?: number;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
}

export interface OpenCodeModelConfig {
  name?: string;
  tool_call?: boolean;
  reasoning?: boolean;
  temperature?: boolean;
  limit?: {
    context?: number;
    output?: number;
  };
  modalities?: {
    input?: string[];
    output?: string[];
  };
  cost?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  options?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  modelsSynced: number;
  error?: string;
}
