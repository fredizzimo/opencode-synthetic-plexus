import { describe, it, expect } from "vitest";
import { parsePrice } from "../src/synthetic.js";

describe("parsePrice", () => {
  it("parses dollar price string and scales by 1M", () => {
    expect(parsePrice("$0.03")).toBe(30_000);
  });

  it("parses price without dollar sign", () => {
    expect(parsePrice("0.03")).toBe(30_000);
  });

  it("parses price with commas", () => {
    expect(parsePrice("$1,000.00")).toBe(1_000_000_000);
  });

  it("parses zero price", () => {
    expect(parsePrice("$0")).toBe(0);
  });

  it("parses zero as bare number", () => {
    expect(parsePrice("0")).toBe(0);
  });

  it("parses very small fractional price", () => {
    expect(parsePrice("$0.000001")).toBe(1);
  });

  it("parses large price", () => {
    expect(parsePrice("$100")).toBe(100_000_000);
  });

  it("removes multiple dollar signs", () => {
    expect(parsePrice("$$0.03")).toBe(30_000);
  });

  it("removes commas and dollar signs together", () => {
    expect(parsePrice("$1,000.50")).toBe(1_000_500_000);
  });

  it("throws on non-numeric string", () => {
    expect(() => parsePrice("abc")).toThrow("Invalid price string: 'abc'");
  });

  it("throws on empty string", () => {
    expect(() => parsePrice("")).toThrow("Invalid price string: ''");
  });

  it("throws on dollar signs only", () => {
    expect(() => parsePrice("$$$")).toThrow();
  });

  it("parses negative price", () => {
    expect(parsePrice("-$0.01")).toBe(-10_000);
  });

  it("parses scientific notation", () => {
    expect(parsePrice("1e-6")).toBeCloseTo(1, 0);
  });
});
