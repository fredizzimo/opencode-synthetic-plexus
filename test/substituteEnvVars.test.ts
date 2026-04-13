import { describe, it, expect } from "vitest";
import { substituteEnvVars, processConfigValues } from "../src/index.js";

describe("substituteEnvVars", () => {
  it("substitutes a single env var", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("{env:MY_VAR}", missing, { MY_VAR: "hello" })).toBe("hello");
    expect(missing.size).toBe(0);
  });

  it("tracks missing env var and leaves placeholder", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("{env:MISSING}", missing, {})).toBe("{env:MISSING}");
    expect(missing).toContain("MISSING");
  });

  it("substitutes multiple env vars in one string", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("{env:A}/{env:B}", missing, { A: "x", B: "y" })).toBe("x/y");
  });

  it("handles mix of present and missing vars", () => {
    const missing = new Set<string>();
    const result = substituteEnvVars("{env:A}/{env:C}", missing, { A: "x" });
    expect(result).toBe("x/{env:C}");
    expect(missing).toContain("C");
    expect(missing.has("A")).toBe(false);
  });

  it("returns unchanged string with no patterns", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("hello world", missing, {})).toBe("hello world");
    expect(missing.size).toBe(0);
  });

  it("handles empty string", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("", missing, {})).toBe("");
  });

  it("handles env var set to empty string", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("{env:EMPTY}", missing, { EMPTY: "" })).toBe("");
    expect(missing.size).toBe(0);
  });

  it("handles repeated same missing var without duplicating in set", () => {
    const missing = new Set<string>();
    substituteEnvVars("{env:X}/{env:X}", missing, {});
    expect(missing.size).toBe(1);
    expect(missing).toContain("X");
  });

  it("handles var name with underscores and digits", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("{env:MY_VAR_2}", missing, { MY_VAR_2: "val" })).toBe("val");
  });

  it("preserves surrounding text around patterns", () => {
    const missing = new Set<string>();
    expect(substituteEnvVars("prefix{env:KEY}suffix", missing, { KEY: "mid" })).toBe("prefixmidsuffix");
  });
});

describe("processConfigValues", () => {
  it("processes strings with env vars", () => {
    const missing = new Set<string>();
    expect(processConfigValues("{env:KEY}", missing, { KEY: "val" })).toBe("val");
  });

  it("processes nested objects", () => {
    const missing = new Set<string>();
    const result = processConfigValues({ a: "{env:X}", b: "static" }, missing, { X: "resolved" }) as Record<
      string,
      unknown
    >;
    expect(result).toEqual({ a: "resolved", b: "static" });
  });

  it("processes arrays", () => {
    const missing = new Set<string>();
    expect(processConfigValues(["{env:X}", "static"], missing, { X: "resolved" })).toEqual(["resolved", "static"]);
  });

  it("tracks missing vars across nested structures", () => {
    const missing = new Set<string>();
    processConfigValues({ a: "{env:A}", b: { c: "{env:B}" } }, missing, {});
    expect(missing).toContain("A");
    expect(missing).toContain("B");
  });

  it("returns non-string primitives unchanged", () => {
    const missing = new Set<string>();
    expect(processConfigValues(42, missing, {})).toBe(42);
    expect(processConfigValues(true, missing, {})).toBe(true);
  });

  it("returns null unchanged", () => {
    const missing = new Set<string>();
    expect(processConfigValues(null, missing, {})).toBe(null);
  });

  it("returns undefined unchanged", () => {
    const missing = new Set<string>();
    expect(processConfigValues(undefined, missing, {})).toBe(undefined);
  });

  it("processes deeply nested structures", () => {
    const missing = new Set<string>();
    const result = processConfigValues({ a: { b: { c: "{env:DEEP}" } } }, missing, { DEEP: "value" }) as Record<
      string,
      unknown
    >;
    expect((result.a as Record<string, unknown>).b).toEqual({ c: "value" });
  });

  it("processes arrays within objects", () => {
    const missing = new Set<string>();
    const result = processConfigValues({ items: ["{env:X}"] }, missing, { X: "found" }) as Record<string, unknown>;
    expect(result).toEqual({ items: ["found"] });
  });

  it("handles empty object", () => {
    const missing = new Set<string>();
    expect(processConfigValues({}, missing, {})).toEqual({});
  });

  it("handles empty array", () => {
    const missing = new Set<string>();
    expect(processConfigValues([], missing, {})).toEqual([]);
  });

  it("does not mutate input object", () => {
    const missing = new Set<string>();
    const input = { a: "{env:X}" };
    processConfigValues(input, missing, { X: "val" });
    expect(input.a).toBe("{env:X}");
  });
});
