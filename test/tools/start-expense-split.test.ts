import { describe, it, expect } from "vitest";
import { startExpenseSplitHandler } from "../../src/tools/start-expense-split.js";

describe("startExpenseSplitHandler", () => {
  it("returns a content array with one text entry", () => {
    const result = startExpenseSplitHandler();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(typeof result.content[0].text).toBe("string");
  });

  it("contains checklist items", () => {
    const result = startExpenseSplitHandler();
    const text = result.content[0].text;
    expect(text).toContain("checklist");
    expect(text).toContain("Event name");
    expect(text).toContain("Currency");
    expect(text).toContain("People");
  });

  it("contains settlement groups pseudocode", () => {
    const result = startExpenseSplitHandler();
    const text = result.content[0].text;
    expect(text).toContain("CHECK_SETTLEMENT_GROUPS");
  });

  it("contains multi-currency pseudocode", () => {
    const result = startExpenseSplitHandler();
    const text = result.content[0].text;
    expect(text).toContain("CHECK_MULTI_CURRENCY");
  });
});
