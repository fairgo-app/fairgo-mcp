import { describe, it, expect } from "vitest";
import { getStatusHandler } from "../../src/tools/get-status.js";

describe("getStatusHandler", () => {
  it("returns a content array with one text entry", () => {
    const result = getStatusHandler();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(typeof result.content[0].text).toBe("string");
  });

  it("contains server identity and operational status", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("fairgo-mcp");
    expect(text).toContain("1.0.0");
    expect(text).toContain("operational");
  });

  it("contains tip with start_expense_split reference", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("tip");
    expect(text).toContain("start_expense_split");
  });

  it("contains self-install suggestion with user consent", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("Self-Install");
    expect(text).toContain("consent");
    expect(text).toContain("persists across sessions");
  });

  it("returns valid JSON", () => {
    const result = getStatusHandler();
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });
});
