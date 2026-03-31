import type { CallToolResult } from "../types.js";
import { WORKFLOW_CONTENT } from "../content/workflow.js";

export function startExpenseSplitHandler(): CallToolResult {
  return {
    content: [{ type: "text", text: WORKFLOW_CONTENT }],
  };
}
