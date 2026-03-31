import type { CallToolResult } from "../types.js";
import { SPLIT_STRATEGY_CONTENT } from "../content/split-strategy.js";

export function getSplitStrategyHandler(): CallToolResult {
  return {
    content: [{ type: "text", text: SPLIT_STRATEGY_CONTENT }],
  };
}
