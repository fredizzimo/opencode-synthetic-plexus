import { describe, it, expect } from "vitest";
import { buildModelAliases } from "../src/synthetic.js";

function asObject(modelIds: string[]): Record<string, string> {
  return Object.fromEntries(buildModelAliases(modelIds));
}

describe("buildModelAliases", () => {
  it("returns empty map for empty input", () => {
    expect(asObject([])).toEqual({});
  });

  it("returns last segment for single model", () => {
    expect(asObject(["provider/gpt-4"])).toEqual({ "provider/gpt-4": "gpt-4" });
  });

  it("returns last segment for models with unique suffixes", () => {
    expect(asObject(["provider-a/gpt-4", "provider-b/claude-3"])).toEqual({
      "provider-a/gpt-4": "gpt-4",
      "provider-b/claude-3": "claude-3",
    });
  });

  it("resolves collision by including parent segment", () => {
    expect(asObject(["provider-a/claude-3", "provider-b/claude-3"])).toEqual({
      "provider-a/claude-3": "provider-a/claude-3",
      "provider-b/claude-3": "provider-b/claude-3",
    });
  });

  it("mixes colliding and non-colliding models", () => {
    expect(asObject(["provider-a/claude-3", "provider-b/claude-3", "openai/gpt-4"])).toEqual({
      "provider-a/claude-3": "provider-a/claude-3",
      "provider-b/claude-3": "provider-b/claude-3",
      "openai/gpt-4": "gpt-4",
    });
  });

  it("resolves deep collisions across three segments", () => {
    expect(asObject(["org-a/proxy/claude-3", "org-b/proxy/claude-3"])).toEqual({
      "org-a/proxy/claude-3": "org-a/proxy/claude-3",
      "org-b/proxy/claude-3": "org-b/proxy/claude-3",
    });
  });

  it("handles three-way collision", () => {
    expect(asObject(["a/llama", "b/llama", "c/llama"])).toEqual({
      "a/llama": "a/llama",
      "b/llama": "b/llama",
      "c/llama": "c/llama",
    });
  });

  it("handles partial collision where some share a suffix but others differ", () => {
    expect(asObject(["a/llama", "b/llama", "c/mixtral"])).toEqual({
      "a/llama": "a/llama",
      "b/llama": "b/llama",
      "c/mixtral": "mixtral",
    });
  });

  it("uses full id when all segments collide", () => {
    expect(asObject(["claude-3"])).toEqual({ "claude-3": "claude-3" });
  });

  it("handles models with different path depths", () => {
    expect(asObject(["deep/nested/model-a", "shallow/model-a"])).toEqual({
      "deep/nested/model-a": "nested/model-a",
      "shallow/model-a": "shallow/model-a",
    });
  });
});
