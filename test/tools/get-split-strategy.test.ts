import { describe, it, expect } from "vitest";
import { getSplitStrategyHandler } from "../../src/tools/get-split-strategy.js";

describe("getSplitStrategyHandler", () => {
  it("returns a content array with one text entry", () => {
    const result = getSplitStrategyHandler();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(typeof result.content[0].text).toBe("string");
  });

  it("contains group-first strategy pseudocode", () => {
    const result = getSplitStrategyHandler();
    const text = result.content[0].text;
    expect(text).toContain("ASSIGN_GROUP_TO_ITEM");
    expect(text).toContain("COMPUTE_WEIGHTS");
  });

  it("contains settlement reference", () => {
    const result = getSplitStrategyHandler();
    const text = result.content[0].text;
    expect(text).toContain("Settlement");
  });
});
