import { describe, it, expect } from "vitest";
import { getStatusHandler } from "../../src/tools/get-status.js";
import { INSTRUCTIONS } from "../../src/content/instructions.js";

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

  it("contains the full FSM pseudocode (same as instructions field)", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("ON_START(user_message)");
    expect(text).toContain("CALL start_expense_split");
    expect(text).toContain("CALL get_split_strategy");
    expect(text).toContain("CALL get_schema_reference");
    expect(text).toContain("CALL create_fair_go_link");
    expect(text).toContain("ON_ERROR");
  });

  it("contains all 7 critical rules", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("Never show JSON");
    expect(text).toContain("Always call");
    expect(text).toContain("Every person gets a split entry");
    expect(text).toContain("amount");
    expect(text).toContain("expenseSplits");
    expect(text).toContain("weight: 0");
    expect(text).toContain("version");
  });

  it("contains self-install suggestion with user consent", () => {
    const result = getStatusHandler();
    const text = result.content[0].text;
    expect(text).toContain("Self-Install");
    expect(text).toContain("consent");
    expect(text).toContain("persists across sessions");
  });

  it("tip is a superset of the instructions field content", () => {
    const result = getStatusHandler();
    const parsed = JSON.parse(result.content[0].text);
    // The tip should contain everything in INSTRUCTIONS plus the self-install section
    expect(parsed.tip).toContain("WORKFLOW FSM");
    expect(parsed.tip).toContain("CRITICAL RULES");
    expect(parsed.tip).toContain("Self-Install Suggestion");
    // Verify the shared constants are actually the same
    expect(INSTRUCTIONS).toContain("ON_START(user_message)");
    expect(parsed.tip).toContain("ON_START(user_message)");
  });

  it("returns valid JSON", () => {
    const result = getStatusHandler();
    expect(() => JSON.parse(result.content[0].text)).not.toThrow();
  });
});
