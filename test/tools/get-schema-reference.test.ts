import { describe, it, expect } from "vitest";
import { getSchemaReferenceHandler } from "../../src/tools/get-schema-reference.js";

describe("getSchemaReferenceHandler", () => {
  it("returns a content array with one text entry", () => {
    const result = getSchemaReferenceHandler();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(typeof result.content[0].text).toBe("string");
  });

  it("contains CalculatorState schema reference", () => {
    const result = getSchemaReferenceHandler();
    const text = result.content[0].text;
    expect(text).toContain("CalculatorState");
    expect(text).toContain("version: 7");
  });

  it("contains at least one example", () => {
    const result = getSchemaReferenceHandler();
    const text = result.content[0].text;
    const hasExample = text.includes("Example 1") || text.includes("Pub Dinner");
    expect(hasExample).toBe(true);
  });

  it("contains multiple currency references", () => {
    const result = getSchemaReferenceHandler();
    const text = result.content[0].text;
    // Schema examples use AUD (home currency) and USD (foreign currency)
    expect(text).toContain("AUD");
    expect(text).toContain("USD");
  });
});
