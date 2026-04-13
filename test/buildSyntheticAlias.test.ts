import { describe, it, expect } from "vitest";
import { buildSyntheticAlias } from "../src/plexus.js";
import type { SyntheticModel, PlexusAlias } from "../src/types.js";

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

describe("buildSyntheticAlias", () => {
  it("creates alias with synthetic target", () => {
    const model = makeModel({ id: "synthetic/llama-3" });
    const result = buildSyntheticAlias(model);
    expect(result.targets).toEqual([{ provider: "synthetic", model: "synthetic/llama-3", enabled: true }]);
  });

  it("preserves non-synthetic targets from existing alias", () => {
    const model = makeModel({ id: "synthetic/llama-3" });
    const existing: PlexusAlias = {
      targets: [
        { provider: "openai", model: "gpt-4", enabled: true },
        { provider: "synthetic", model: "synthetic/old-model", enabled: true },
      ],
    };
    const result = buildSyntheticAlias(model, existing);
    const syntheticTargets = result.targets.filter((t) => t.provider === "synthetic");
    const nonSyntheticTargets = result.targets.filter((t) => t.provider !== "synthetic");
    expect(syntheticTargets).toEqual([{ provider: "synthetic", model: "synthetic/llama-3", enabled: true }]);
    expect(nonSyntheticTargets).toEqual([{ provider: "openai", model: "gpt-4", enabled: true }]);
  });

  it("places synthetic target first", () => {
    const model = makeModel({ id: "synthetic/llama-3" });
    const existing: PlexusAlias = {
      targets: [{ provider: "openai", model: "gpt-4", enabled: true }],
    };
    const result = buildSyntheticAlias(model, existing);
    expect(result.targets[0].provider).toBe("synthetic");
  });

  it("uses default priority when existing alias has none", () => {
    const result = buildSyntheticAlias(makeModel());
    expect(result.priority).toBe("selector");
  });

  it("preserves priority from existing alias", () => {
    const existing: PlexusAlias = { targets: [], priority: "custom" };
    const result = buildSyntheticAlias(makeModel(), existing);
    expect(result.priority).toBe("custom");
  });

  it("uses default selector when existing alias has none", () => {
    const result = buildSyntheticAlias(makeModel());
    expect(result.selector).toBe("in_order");
  });

  it("preserves selector from existing alias", () => {
    const existing: PlexusAlias = { targets: [], selector: "random" };
    const result = buildSyntheticAlias(makeModel(), existing);
    expect(result.selector).toBe("random");
  });

  it("defaults use_image_fallthrough to false", () => {
    const result = buildSyntheticAlias(makeModel());
    expect(result.use_image_fallthrough).toBe(false);
  });

  it("preserves use_image_fallthrough from existing alias", () => {
    const existing: PlexusAlias = { targets: [], use_image_fallthrough: true };
    const result = buildSyntheticAlias(makeModel(), existing);
    expect(result.use_image_fallthrough).toBe(true);
  });

  it("defaults additional_aliases to empty array", () => {
    const result = buildSyntheticAlias(makeModel());
    expect(result.additional_aliases).toEqual([]);
  });

  it("preserves additional_aliases from existing alias", () => {
    const existing: PlexusAlias = { targets: [], additional_aliases: ["alt-1", "alt-2"] };
    const result = buildSyntheticAlias(makeModel(), existing);
    expect(result.additional_aliases).toEqual(["alt-1", "alt-2"]);
  });

  it("removes old synthetic targets from existing alias", () => {
    const model = makeModel({ id: "synthetic/new-model" });
    const existing: PlexusAlias = {
      targets: [
        { provider: "synthetic", model: "synthetic/old-model", enabled: true },
        { provider: "openai", model: "gpt-4", enabled: true },
      ],
    };
    const result = buildSyntheticAlias(model, existing);
    const syntheticTargets = result.targets.filter((t) => t.provider === "synthetic");
    expect(syntheticTargets).toHaveLength(1);
    expect(syntheticTargets[0].model).toBe("synthetic/new-model");
  });

  it("works without existing alias", () => {
    const result = buildSyntheticAlias(makeModel());
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0]).toEqual({ provider: "synthetic", model: "synthetic/test-model", enabled: true });
  });
});
