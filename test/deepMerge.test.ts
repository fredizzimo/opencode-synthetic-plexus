import { describe, it, expect } from "vitest";
import { deepMerge } from "../src/update-opencode.js";

describe("deepMerge", () => {
  it("merges flat objects", () => {
    expect(deepMerge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("source overrides target for same key", () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it("deeply merges nested objects", () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 3, d: 4 } })).toEqual({ a: { b: 1, c: 3, d: 4 } });
  });

  it("replaces arrays instead of merging them", () => {
    expect(deepMerge({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });

  it("replaces object with non-object value from source", () => {
    expect(deepMerge({ a: { b: 1 } }, { a: "string" })).toEqual({ a: "string" });
  });

  it("replaces non-object value with object from source", () => {
    expect(deepMerge({ a: "string" }, { a: { b: 1 } })).toEqual({ a: { b: 1 } });
  });

  it("sets null from source overriding target object", () => {
    expect(deepMerge({ a: { b: 1 } }, { a: null })).toEqual({ a: null });
  });

  it("sets object from source overriding target null", () => {
    expect(deepMerge({ a: null }, { a: { b: 1 } })).toEqual({ a: { b: 1 } });
  });

  it("does not mutate the target object", () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    deepMerge(target, source);
    expect(target).toEqual({ a: { b: 1 } });
  });

  it("returns empty object for two empty objects", () => {
    expect(deepMerge({}, {})).toEqual({});
  });

  it("handles deeply nested merge across three levels", () => {
    expect(deepMerge({ a: { b: { c: { d: 1 } } } }, { a: { b: { c: { e: 2 } } } })).toEqual({
      a: { b: { c: { d: 1, e: 2 } } },
    });
  });

  it("overrides target value with undefined from source", () => {
    expect(deepMerge({ a: 1 }, { a: undefined })).toEqual({ a: undefined });
  });

  it("preserves target keys not present in source", () => {
    expect(deepMerge({ a: 1, b: 2, c: 3 }, { b: 20 })).toEqual({ a: 1, b: 20, c: 3 });
  });

  it("handles empty source by returning copy of target", () => {
    expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
  });

  it("handles empty target by returning copy of source", () => {
    expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
  });

  it("replaces number with array from source", () => {
    expect(deepMerge({ a: 1 }, { a: [1, 2] })).toEqual({ a: [1, 2] });
  });

  it("replaces array with number from source", () => {
    expect(deepMerge({ a: [1, 2] }, { a: 1 })).toEqual({ a: 1 });
  });

  it("handles boolean values", () => {
    expect(deepMerge({ a: true }, { a: false })).toEqual({ a: false });
  });
});
