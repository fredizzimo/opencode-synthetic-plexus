export interface SyntheticPricing {
  prompt: string;
  completion: string;
  image?: string;
  request?: string;
  input_cache_reads?: string;
  input_cache_writes?: string;
}

export interface SyntheticModel {
  provider: "synthetic" | "fireworks" | "together";
  always_on?: boolean;
  id: string;
  hugging_face_id?: string;
  name: string;
  input_modalities: string[];
  output_modalities: string[];
  context_length: number;
  max_output_length: number;
  pricing: SyntheticPricing;
  created?: number;
  quantization?: string;
  supported_sampling_parameters?: string[];
  supported_features: string[];
  openrouter?: { slug: string };
  datacenters?: { country_code: string }[];
}

export interface PlexusPricing {
  source: string;
  input: number;
  output: number;
  cached?: number;
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

export interface QuotaChecker {
  type: string;
  enabled: boolean;
  intervalMinutes?: number;
  options?: Record<string, unknown>;
}

export interface PlexusProvider {
  api_base_url?: { chat: string };
  display_name?: string;
  api_key?: string;
  enabled?: boolean;
  disable_cooldown?: boolean;
  models?: Record<string, PlexusModelConfig>;
  quota_checker?: QuotaChecker;
}

export interface OpenCodeModelConfig {
  id?: string;
  name?: string;
  family?: string;
  release_date?: string;
  attachment?: boolean;
  reasoning?: boolean;
  temperature?: boolean;
  tool_call?: boolean;
  interleaved?: boolean | { field: "reasoning_content" | "reasoning_details" };
  cost?: {
    input: number;
    output: number;
    cache_read?: number;
    cache_write?: number;
    context_over_200k?: {
      input: number;
      output: number;
      cache_read?: number;
      cache_write?: number;
    };
  };
  limit?: {
    context: number;
    output: number;
    input?: number;
  };
  modalities?: {
    input: string[];
    output: string[];
  };
  experimental?: boolean;
  status?: "alpha" | "beta" | "deprecated";
  provider?: {
    npm: string;
    api: string;
  };
  options?: Record<string, unknown>;
  headers?: Record<string, string>;
  variants?: Record<string, Record<string, unknown>>;
}

export interface PluginConfig {
  plexusUrl?: string;
  syntheticApiUrl?: string;
  openCodeSyntheticProviderName?: string;
  openCodePlexusProviderName?: string;
  plexusProviderName?: string;
  syntheticApiKey?: string;
  plexusAdminKey?: string;
  cacheDiscount?: number;
  modelOptions?: Record<string, Record<string, unknown>>;
}

export interface ResolvedPluginConfig {
  plexusUrl: string;
  syntheticApiUrl: string;
  openCodeSyntheticProviderName: string;
  openCodePlexusProviderName?: string;
  plexusProviderName: string;
  syntheticApiKey?: string;
  plexusAdminKey?: string;
  cacheDiscount: number;
  modelOptions: Record<string, Record<string, unknown>>;
}

export interface OpenCodeAppConfig {
  provider?: Record<string, unknown>;
}
