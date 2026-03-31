/**
 * Shared types for MCP tool handlers.
 * Mirrors the MCP SDK CallToolResult shape without requiring the SDK as a dependency.
 */

export interface CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}
