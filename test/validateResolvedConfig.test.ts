import { describe, it, expect } from "vitest";
import { validateResolvedConfig } from "../src/index.js";
import type { ResolvedPluginConfig } from "../src/types.js";

function baseConfig(overrides: Partial<ResolvedPluginConfig> = {}): ResolvedPluginConfig {
  return {
    plexusUrl: "http://localhost:8080",
    syntheticApiUrl: "https://api.synthetic.new/openai/v1",
    plexusProviderName: "synthetic",
    cacheDiscount: 80,
    modelOptions: {},
    ...overrides,
  };
}

describe("validateResolvedConfig", () => {
  it("accepts config with no plexus settings", () => {
    expect(() => validateResolvedConfig(baseConfig())).not.toThrow();
  });

  it("accepts config with both plexusAdminKey and openCodePlexusProviderName", () => {
    expect(() =>
      validateResolvedConfig(
        baseConfig({
          plexusAdminKey: "key",
          openCodePlexusProviderName: "synthetic-plexus",
        }),
      ),
    ).not.toThrow();
  });

  it("accepts config with openCodeSyntheticProviderName only", () => {
    expect(() => validateResolvedConfig(baseConfig({ openCodeSyntheticProviderName: "synthetic" }))).not.toThrow();
  });

  it("accepts config with both provider names and plexus", () => {
    expect(() =>
      validateResolvedConfig(
        baseConfig({
          openCodeSyntheticProviderName: "synthetic",
          openCodePlexusProviderName: "synthetic-plexus",
          plexusAdminKey: "key",
        }),
      ),
    ).not.toThrow();
  });

  it("throws when plexusAdminKey is set without openCodePlexusProviderName", () => {
    expect(() => validateResolvedConfig(baseConfig({ plexusAdminKey: "key" }))).toThrow(
      "openCodePlexusProviderName is required when plexusAdminKey is set",
    );
  });

  it("throws when openCodePlexusProviderName is set without plexusAdminKey", () => {
    expect(() => validateResolvedConfig(baseConfig({ openCodePlexusProviderName: "synthetic-plexus" }))).toThrow(
      "plexusAdminKey is required when openCodePlexusProviderName is set",
    );
  });
});
