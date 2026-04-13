import { describe, it, expect } from "vitest";
import { validatePlexusProviderResponse } from "../src/validate.js";

describe("validatePlexusProviderResponse with quota_checker", () => {
  it("parses provider with quota_checker", () => {
    const data = {
      api_base_url: { chat: "https://api.synthetic.new/openai/v1" },
      display_name: "Synthetic",
      api_key: "test-key",
      enabled: true,
      models: {},
      quota_checker: {
        type: "synthetic",
        enabled: true,
        intervalMinutes: 5,
        options: {},
      },
    };
    const result = validatePlexusProviderResponse(data);
    expect(result.quota_checker).toEqual({
      type: "synthetic",
      enabled: true,
      intervalMinutes: 5,
      options: {},
    });
  });

  it("parses provider without quota_checker", () => {
    const data = {
      api_base_url: { chat: "https://api.synthetic.new/openai/v1" },
      display_name: "Synthetic",
      models: {},
    };
    const result = validatePlexusProviderResponse(data);
    expect(result.quota_checker).toBeUndefined();
  });

  it("parses quota_checker without optional fields", () => {
    const data = {
      quota_checker: {
        type: "zai",
        enabled: true,
      },
    };
    const result = validatePlexusProviderResponse(data);
    expect(result.quota_checker?.type).toBe("zai");
    expect(result.quota_checker?.enabled).toBe(true);
    expect(result.quota_checker?.intervalMinutes).toBeUndefined();
    expect(result.quota_checker?.options).toBeUndefined();
  });

  it("preserves unknown quota_checker fields via passthrough", () => {
    const data = {
      quota_checker: {
        type: "synthetic",
        enabled: true,
        customField: "custom-value",
      },
    };
    const result = validatePlexusProviderResponse(data);
    expect(result.quota_checker?.customField).toBe("custom-value");
  });
});
