import { z } from "zod";
import type { PlexusAlias, PlexusProvider, PluginConfig, SyntheticModel } from "./types.js";

const SyntheticPricingSchema = z.object({
  prompt: z.coerce.string(),
  completion: z.coerce.string(),
  input_cache_reads: z.coerce.string().optional(),
  input_cache_writes: z.coerce.string().optional(),
}).passthrough();

const SyntheticModelSchema = z.object({
  provider: z.string(),
  id: z.string(),
  name: z.string(),
  input_modalities: z.array(z.string()).optional().default([]),
  output_modalities: z.array(z.string()).optional().default([]),
  context_length: z.union([z.coerce.number(), z.null()]).optional(),
  max_output_length: z.union([z.coerce.number(), z.null()]).optional(),
  pricing: SyntheticPricingSchema,
  supported_features: z.array(z.string()).optional().default([]),
  openrouter: z.object({ slug: z.string() }).optional(),
}).passthrough();

const SyntheticApiResponseSchema = z.object({
  data: z.array(SyntheticModelSchema),
}).passthrough();

const PlexusTargetSchema = z.object({
  provider: z.string(),
  model: z.string(),
  enabled: z.boolean(),
});

const PlexusAliasSchema = z.object({
  targets: z.array(PlexusTargetSchema),
  selector: z.string().optional(),
  priority: z.string().optional(),
  use_image_fallthrough: z.boolean().optional(),
  additional_aliases: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const PlexusProviderSchema = z.object({
  api_base_url: z.object({ chat: z.string() }).optional(),
  display_name: z.string().optional(),
  api_key: z.string().optional(),
  enabled: z.boolean().optional(),
  disable_cooldown: z.boolean().optional(),
  models: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const PlexusAliasesResponseSchema = z.record(z.string(), PlexusAliasSchema);

const PluginConfigSchema = z.object({
  plexusUrl: z.string().optional(),
  syntheticApiUrl: z.string().optional(),
  providerName: z.string().optional(),
  syntheticApiKey: z.string().optional(),
  plexusAdminKey: z.string().optional(),
  modelOptions: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  verbose: z.boolean().optional(),
}).passthrough();

export function validateSyntheticApiResponse(data: unknown): { data: SyntheticModel[] } {
  return SyntheticApiResponseSchema.parse(data) as { data: SyntheticModel[] };
}

export function validatePlexusAliasesResponse(data: unknown): Record<string, PlexusAlias> {
  return PlexusAliasesResponseSchema.parse(data) as Record<string, PlexusAlias>;
}

export function validatePlexusProviderResponse(data: unknown): PlexusProvider {
  return PlexusProviderSchema.parse(data) as PlexusProvider;
}

export function validatePluginConfig(data: unknown): PluginConfig {
  return PluginConfigSchema.parse(data) as PluginConfig;
}
