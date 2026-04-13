import { describe, it, expect } from "vitest";
import { validatePluginConfig } from "../src/validate.js";

describe("validatePluginConfig", () => {
  it("accepts empty config", () => {
    expect(validatePluginConfig({})).toEqual({});
  });

  it("accepts all valid fields", () => {
    const config = {
      plexusUrl: "http://localhost:8080",
      syntheticApiUrl: "https://api.synthetic.new/openai/v1",
      openCodeSyntheticProviderName: "synthetic",
      openCodePlexusProviderName: "synthetic-plexus",
      plexusProviderName: "synthetic",
      syntheticApiKey: "syn_abc123",
      plexusAdminKey: "admin-key",
      cacheDiscount: 80,
      modelOptions: { "GLM-5": { options: { temperature: 0.7 } } },
    };
    expect(validatePluginConfig(config)).toEqual(config);
  });

  it("rejects unknown fields", () => {
    expect(() => validatePluginConfig({ providerName: "synthetic" })).toThrow();
  });

  it("rejects multiple unknown fields", () => {
    expect(() => validatePluginConfig({ foo: "bar", baz: 42 })).toThrow();
  });

  it("rejects cacheDiscount below 0", () => {
    expect(() => validatePluginConfig({ cacheDiscount: -1 })).toThrow();
  });

  it("rejects cacheDiscount above 100", () => {
    expect(() => validatePluginConfig({ cacheDiscount: 101 })).toThrow();
  });

  it("accepts cacheDiscount at 0", () => {
    expect(validatePluginConfig({ cacheDiscount: 0 })).toEqual({ cacheDiscount: 0 });
  });

  it("accepts cacheDiscount at 100", () => {
    expect(validatePluginConfig({ cacheDiscount: 100 })).toEqual({ cacheDiscount: 100 });
  });

  it("rejects cacheDiscount as string", () => {
    expect(() => validatePluginConfig({ cacheDiscount: "50" })).toThrow();
  });

  it("rejects string field with wrong type", () => {
    expect(() => validatePluginConfig({ plexusUrl: 123 })).toThrow();
  });

  it("accepts modelOptions with nested objects", () => {
    const config = {
      modelOptions: {
        "GLM-5": { options: { temperature: 0.7 } },
        "DeepSeek-R1": { interleaved: { field: "reasoning_content" } },
      },
    };
    expect(validatePluginConfig(config)).toEqual(config);
  });

  it("rejects modelOptions with non-object values", () => {
    expect(() => validatePluginConfig({ modelOptions: { "GLM-5": "not-an-object" } })).toThrow();
  });
});
