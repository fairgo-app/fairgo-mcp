import { describe, it, expect } from "vitest";
import {
  splitReceiptPrompt,
  splitExpensesPrompt,
} from "../../src/prompts/index.js";

describe("splitReceiptPrompt", () => {
  it("returns a messages array with one entry", () => {
    const result = splitReceiptPrompt();
    expect(result.messages).toHaveLength(1);
  });

  it("message has role user", () => {
    const result = splitReceiptPrompt();
    expect(result.messages[0].role).toBe("user");
  });

  it("message content has type text", () => {
    const result = splitReceiptPrompt();
    expect(result.messages[0].content.type).toBe("text");
  });

  it("message text contains receipt keyword", () => {
    const result = splitReceiptPrompt();
    expect(result.messages[0].content.text).toContain("receipt");
  });

  it("message text contains split keyword", () => {
    const result = splitReceiptPrompt();
    expect(result.messages[0].content.text).toContain("split");
  });
});

describe("splitExpensesPrompt", () => {
  it("returns a messages array with one entry", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages).toHaveLength(1);
  });

  it("message has role user", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages[0].role).toBe("user");
  });

  it("message content has type text", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages[0].content.type).toBe("text");
  });

  it("message text contains split keyword", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages[0].content.text).toContain("split");
  });

  it("message text contains expenses keyword", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages[0].content.text).toContain("expenses");
  });

  it("includes num_people count when provided", () => {
    const result = splitExpensesPrompt({ num_people: 4 });
    expect(result.messages[0].content.text).toContain("4");
  });

  it("includes people in text when num_people is provided", () => {
    const result = splitExpensesPrompt({ num_people: 3 });
    expect(result.messages[0].content.text).toContain("3 people");
  });

  it("uses generic fallback when num_people is not provided", () => {
    const result = splitExpensesPrompt({});
    expect(result.messages[0].content.text).toContain(
      "among the people involved"
    );
  });
});
