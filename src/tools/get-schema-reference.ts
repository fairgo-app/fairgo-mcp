import type { CallToolResult } from "../types.js";
import { SCHEMA_CONTENT } from "../content/schema.js";

export function getSchemaReferenceHandler(): CallToolResult {
  return {
    content: [{ type: "text", text: SCHEMA_CONTENT }],
  };
}
