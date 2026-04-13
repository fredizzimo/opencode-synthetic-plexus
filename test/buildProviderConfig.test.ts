import { describe, it, expect } from "vitest";
import { buildProviderConfig } from "../src/update-opencode.js";
import type { SyntheticModel } from "../src/types.js";

function makeModel(overrides: Partial<SyntheticModel> = {}): SyntheticModel {
  return {
    provider: "synthetic",
    id: "synthetic/test-model",
    name: "Test Model",
    input_modalities: [],
    output_modalities: [],
    context_length: 8192,
    max_output_length: 4096,
    pricing: { prompt: "$0.01", completion: "$0.02" },
    supported_features: [],
    ...overrides,
  };
}

describe("buildProviderConfig", () => {
  it("returns correct npm package", () => {
    const result = buildProviderConfig([], "http://localhost:8080/v1", "my-provider", true);
    expect(result.npm).toBe("@ai-sdk/openai-compatible");
  });

  it("uses the provided provider name", () => {
    const result = buildProviderConfig([], "http://localhost:8080/v1", "custom-name", true);
    expect(result.name).toBe("custom-name");
  });

  it("sets baseURL in options", () => {
    const result = buildProviderConfig([], "http://localhost:8080/v1", "test", true);
    expect(result.options.baseURL).toBe("http://localhost:8080/v1");
  });

  it("returns empty models for empty input", () => {
    const result = buildProviderConfig([], "http://localhost:8080/v1", "test", true);
    expect(result.models).toEqual({});
  });

  it("maps single model to config", () => {
    const models = [makeModel()];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true);
    expect(Object.keys(result.models)).toHaveLength(1);
    expect(result.models["test-model"]).toBeDefined();
  });

  it("uses alias names as model keys", () => {
    const models = [makeModel({ id: "provider-a/llama-3" }), makeModel({ id: "provider-b/llama-3" })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true);
    expect(result.models["provider-a/llama-3"]).toBeDefined();
    expect(result.models["provider-b/llama-3"]).toBeDefined();
  });

  it("converts model properties correctly", () => {
    const models = [makeModel({ supported_features: ["tools"] })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true);
    expect(result.models["test-model"].tool_call).toBe(true);
    expect(result.models["test-model"].name).toBe("test-model");
  });

  it("applies modelOptions to matching alias names", () => {
    const models = [makeModel({ id: "synthetic/llama-3" })];
    const modelOptions = {
      "llama-3": { reasoning: true, temperature: false },
    };
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, modelOptions);
    expect(result.models["llama-3"].reasoning).toBe(true);
    expect(result.models["llama-3"].temperature).toBe(false);
  });

  it("does not apply modelOptions to non-matching alias names", () => {
    const models = [makeModel({ id: "synthetic/llama-3" })];
    const modelOptions = {
      "non-existent": { reasoning: true },
    };
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, modelOptions);
    expect(result.models["llama-3"].reasoning).toBeUndefined();
  });

  it("handles multiple models with different providers", () => {
    const models = [
      makeModel({ id: "fireworks/llama-3", provider: "fireworks" }),
      makeModel({ id: "together/mistral-7b", provider: "together" }),
    ];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "multi", true);
    expect(Object.keys(result.models)).toHaveLength(2);
    expect(result.models["llama-3"]).toBeDefined();
    expect(result.models["mistral-7b"]).toBeDefined();
  });

  it("handles modelOptions with undefined gracefully", () => {
    const models = [makeModel()];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true);
    expect(result.models["test-model"]).toBeDefined();
  });

  it("applies cache discount to cache_read pricing", () => {
    const models = [makeModel({ pricing: { prompt: "$0.01", completion: "$0.02", input_cache_reads: "$0.001" } })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, undefined, 80);
    expect(result.models["test-model"].cost?.cache_read).toBeCloseTo(200);
  });

  it("omits cache_read when input_cache_reads is absent and cacheDiscount > 0", () => {
    const models = [makeModel()];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, undefined, 80);
    expect(result.models["test-model"].cost?.cache_read).toBeUndefined();
  });

  it("omits cache_read when input_cache_reads is absent and cacheDiscount is 0", () => {
    const models = [makeModel()];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, undefined, 0);
    expect(result.models["test-model"].cost?.cache_read).toBeUndefined();
  });

  it("does not apply cache discount when cacheDiscount is 0", () => {
    const models = [makeModel({ pricing: { prompt: "$0.01", completion: "$0.02", input_cache_reads: "$0.001" } })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true, undefined, 0);
    expect(result.models["test-model"].cost?.cache_read).toBe(1_000);
  });

  it("sets model id when useModelId is true", () => {
    const models = [makeModel({ id: "hf:microsoft/phi-4" })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", true);
    expect(result.models["phi-4"].id).toBe("hf:microsoft/phi-4");
  });

  it("does not set model id when useModelId is false", () => {
    const models = [makeModel({ id: "hf:microsoft/phi-4" })];
    const result = buildProviderConfig(models, "http://localhost:8080/v1", "test", false);
    expect(result.models["phi-4"].id).toBeUndefined();
  });
});
