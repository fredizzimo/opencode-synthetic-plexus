import { describe, it, expect } from "vitest";
import { convertSyntheticModelToOpenCode } from "../src/update-opencode.js";
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
    pricing: {
      prompt: "$0.01",
      completion: "$0.02",
    },
    supported_features: [],
    ...overrides,
  };
}

describe("convertSyntheticModelToOpenCode", () => {
  it("sets name from model simple name", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.name).toBe("test-model");
  });

  it("sets tool_call when tools feature is supported", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ supported_features: ["tools"] }));
    expect(result.tool_call).toBe(true);
  });

  it("does not set tool_call when tools feature is absent", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.tool_call).toBeUndefined();
  });

  it("sets reasoning when reasoning feature is supported", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ supported_features: ["reasoning"] }));
    expect(result.reasoning).toBe(true);
  });

  it("does not set reasoning when reasoning feature is absent", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.reasoning).toBeUndefined();
  });

  it("sets temperature when supported_sampling_parameters includes temperature", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ supported_sampling_parameters: ["temperature"] }));
    expect(result.temperature).toBe(true);
  });

  it("does not set temperature when supported_sampling_parameters is missing", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.temperature).toBeUndefined();
  });

  it("sets limit with context and output when both are present", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ context_length: 32768, max_output_length: 8192 }));
    expect(result.limit).toEqual({ context: 32768, output: 8192 });
  });

  it("sets limit with output 0 when context_length is present but max_output_length is missing", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ context_length: 32768, max_output_length: undefined }));
    expect(result.limit).toEqual({ context: 32768, output: 0 });
  });

  it("does not set limit when context_length is missing", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ context_length: undefined, max_output_length: 4096 }));
    expect(result.limit).toBeUndefined();
  });

  it("sets modalities when both input and output are non-empty", () => {
    const result = convertSyntheticModelToOpenCode(
      makeModel({ input_modalities: ["text", "image"], output_modalities: ["text"] }),
    );
    expect(result.modalities).toEqual({ input: ["text", "image"], output: ["text"] });
  });

  it("does not set modalities when input_modalities is empty", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ input_modalities: [], output_modalities: ["text"] }));
    expect(result.modalities).toBeUndefined();
  });

  it("does not set modalities when output_modalities is empty", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ input_modalities: ["text"], output_modalities: [] }));
    expect(result.modalities).toBeUndefined();
  });

  it("sets cost with input and output from pricing", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.cost).toEqual({ input: 10_000, output: 20_000 });
  });

  it("sets cache_read cost when input_cache_reads is present", () => {
    const result = convertSyntheticModelToOpenCode(
      makeModel({ pricing: { prompt: "$0.01", completion: "$0.02", input_cache_reads: "$0.001" } }),
    );
    expect(result.cost?.cache_read).toBe(1_000);
  });

  it("sets cache_write cost when input_cache_writes is present", () => {
    const result = convertSyntheticModelToOpenCode(
      makeModel({ pricing: { prompt: "$0.01", completion: "$0.02", input_cache_writes: "$0.005" } }),
    );
    expect(result.cost?.cache_write).toBe(5_000);
  });

  it("omits cache_read and cache_write when not in pricing", () => {
    const result = convertSyntheticModelToOpenCode(makeModel());
    expect(result.cost?.cache_read).toBeUndefined();
    expect(result.cost?.cache_write).toBeUndefined();
  });

  it("applies user config via deepMerge", () => {
    const result = convertSyntheticModelToOpenCode(makeModel(), { reasoning: true, temperature: false });
    expect(result.reasoning).toBe(true);
    expect(result.temperature).toBe(false);
  });

  it("user config can add new keys", () => {
    const result = convertSyntheticModelToOpenCode(makeModel(), { experimental: true });
    expect(result.experimental).toBe(true);
  });

  it("handles model with provider prefix in id", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ id: "fireworks/llama-3" }));
    expect(result.name).toBe("llama-3");
  });

  it("handles model id without provider prefix", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ id: "gpt-4" }));
    expect(result.name).toBe("gpt-4");
  });

  it("handles multiple supported features together", () => {
    const result = convertSyntheticModelToOpenCode(makeModel({ supported_features: ["tools", "reasoning"] }));
    expect(result.tool_call).toBe(true);
    expect(result.reasoning).toBe(true);
  });
});
