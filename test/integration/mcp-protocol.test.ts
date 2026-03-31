/**
 * Integration tests for the MCP server protocol flow.
 *
 * These tests run against a live wrangler dev server and exercise
 * the full MCP Streamable HTTP protocol: initialize → session →
 * tool calls → prompt listing.
 *
 * Run with: npx vitest run test/integration/
 * Requires: npx wrangler dev running on port 8799
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = "http://localhost:8799";
const MCP_URL = `${BASE_URL}/mcp`;

const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

/**
 * Parse an SSE response body into the JSON data payload.
 * MCP Streamable HTTP returns `event: message\ndata: {...}\n\n`
 */
function parseSSE(body: string): unknown {
  const lines = body.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      return JSON.parse(line.slice(6));
    }
  }
  throw new Error(`No data line found in SSE response:\n${body}`);
}

/**
 * Send a JSON-RPC request to the MCP endpoint and return parsed result.
 */
async function mcpRequest(
  method: string,
  params: Record<string, unknown> = {},
  id: number | null = null,
  sessionId?: string
): Promise<{ headers: Headers; body: string; parsed?: unknown }> {
  const headers: Record<string, string> = { ...MCP_HEADERS };
  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const payload: Record<string, unknown> = {
    jsonrpc: "2.0",
    method,
  };
  if (Object.keys(params).length > 0) {
    payload.params = params;
  }
  if (id !== null) {
    payload.id = id;
  }

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const body = await response.text();
  let parsed: unknown;
  try {
    parsed = parseSSE(body);
  } catch {
    // May be a direct JSON response (errors, notifications)
    try {
      parsed = JSON.parse(body);
    } catch {
      // Leave parsed as undefined
    }
  }

  return { headers: response.headers, body, parsed };
}

/**
 * Establish a full MCP session: initialize + notifications/initialized.
 * Returns the session ID.
 */
async function establishSession(): Promise<string> {
  const initResponse = await mcpRequest(
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "integration-test", version: "1.0.0" },
    },
    1
  );

  const sessionId = initResponse.headers.get("mcp-session-id");
  if (!sessionId) {
    throw new Error(
      `No mcp-session-id header in initialize response.\nHeaders: ${JSON.stringify(Object.fromEntries(initResponse.headers.entries()))}\nBody: ${initResponse.body.slice(0, 500)}`
    );
  }

  // Send initialized notification (no id = notification)
  await mcpRequest("notifications/initialized", {}, null, sessionId);

  return sessionId;
}

// ─── Connectivity ────────────────────────────────────────────────

describe("Connectivity", () => {
  it("GET / returns landing page with connection instructions", async () => {
    const res = await fetch(BASE_URL);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Fair Go");
    expect(body).toContain("Split Expenses Fairly");
    expect(body).toContain("/mcp");
    expect(body).toContain("Custom Connector");
    expect(body).toContain("fairgo.app");
    expect(body).toContain("ChatGPT");
  });

  it("GET /health returns JSON health check", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      status: "ok",
      server: "fairgo-mcp",
      version: "1.0.0",
    });
  });

  it("GET /healthz aliases to /health", async () => {
    const res = await fetch(`${BASE_URL}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("GET /mcp returns same landing page as /", async () => {
    const [rootRes, mcpRes] = await Promise.all([
      fetch(BASE_URL),
      fetch(MCP_URL),
    ]);
    const rootBody = await rootRes.text();
    const mcpBody = await mcpRes.text();

    expect(mcpRes.status).toBe(200);
    expect(mcpRes.headers.get("content-type")).toContain("text/markdown");
    expect(mcpBody).toBe(rootBody);
  });

  it("POST /mcp without Accept: text/event-stream returns landing page", async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {},
        id: 1,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    const body = await res.text();
    expect(body).toContain("Fair Go");
    expect(body).toContain("Custom Connector");
  });
});

// ─── MCP Handshake ───────────────────────────────────────────────

describe("MCP Handshake", () => {
  it("initialize returns protocol version and server info", async () => {
    const { parsed, headers } = await mcpRequest(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
      1
    );

    const result = (parsed as { result: Record<string, unknown> }).result;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toEqual({
      name: "fairgo-mcp",
      version: "1.0.0",
    });

    // Session ID must be present
    expect(headers.get("mcp-session-id")).toBeTruthy();
  });

  it("initialize returns instructions field with FSM", async () => {
    const { parsed } = await mcpRequest(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
      1
    );

    const result = (parsed as { result: { instructions: string } }).result;
    expect(result.instructions).toContain("Fair Go");
    expect(result.instructions).toContain("WORKFLOW FSM");
    expect(result.instructions).toContain("CRITICAL RULES");
    expect(result.instructions).toContain("start_expense_split");
    expect(result.instructions).toContain("create_fair_go_link");
  });

  it("initialize advertises tools and prompts capabilities", async () => {
    const { parsed } = await mcpRequest(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0.0" },
      },
      1
    );

    const result = (parsed as { result: { capabilities: Record<string, unknown> } }).result;
    expect(result.capabilities.tools).toBeTruthy();
    expect(result.capabilities.prompts).toBeTruthy();
  });

  it("requests without session ID after init return 400", async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: MCP_HEADERS,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        params: {},
        id: 1,
      }),
    });
    const body = await res.text();
    expect(body).toContain("Session-Id");
  });

  it("full session establishment succeeds", async () => {
    const sessionId = await establishSession();
    expect(sessionId).toBeTruthy();
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(10);
  });
});

// ─── Tools ───────────────────────────────────────────────────────

describe("Tools", () => {
  let sessionId: string;

  beforeAll(async () => {
    sessionId = await establishSession();
  });

  it("tools/list returns all 7 tools", async () => {
    const { parsed } = await mcpRequest("tools/list", {}, 10, sessionId);
    const result = (parsed as { result: { tools: Array<{ name: string }> } }).result;
    const names = result.tools.map((t) => t.name).sort();

    expect(names).toEqual([
      "create_fair_go_link",
      "fetch_exchange_rates",
      "get_schema_reference",
      "get_split_strategy",
      "get_status",
      "resolve_fair_go_link",
      "start_expense_split",
    ]);
  });

  it("tools/list includes descriptions for every tool", async () => {
    const { parsed } = await mcpRequest("tools/list", {}, 11, sessionId);
    const result = (parsed as { result: { tools: Array<{ name: string; description: string }> } }).result;

    for (const tool of result.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it("call get_status returns operational status with tip", async () => {
    const { parsed } = await mcpRequest(
      "tools/call",
      { name: "get_status", arguments: {} },
      20,
      sessionId
    );

    const result = (parsed as { result: { content: Array<{ type: string; text: string }> } }).result;
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const payload = JSON.parse(result.content[0].text);
    expect(payload.server).toBe("fairgo-mcp");
    expect(payload.status).toBe("operational");
    expect(payload.tip).toContain("start_expense_split");
    expect(payload.tip).toContain("Self-Install");
  });

  it("call start_expense_split returns workflow pseudocode", async () => {
    const { parsed } = await mcpRequest(
      "tools/call",
      { name: "start_expense_split", arguments: {} },
      21,
      sessionId
    );

    const result = (parsed as { result: { content: Array<{ type: string; text: string }> } }).result;
    expect(result.content[0].text).toContain("checklist");
    expect(result.content[0].text).toContain("CHECK_SETTLEMENT_GROUPS");
  });

  it("call get_schema_reference returns CalculatorState schema", async () => {
    const { parsed } = await mcpRequest(
      "tools/call",
      { name: "get_schema_reference", arguments: {} },
      22,
      sessionId
    );

    const result = (parsed as { result: { content: Array<{ type: string; text: string }> } }).result;
    expect(result.content[0].text).toContain("CalculatorState");
    expect(result.content[0].text).toContain("version: 7");
  });

  it("call get_split_strategy returns group-first pseudocode", async () => {
    const { parsed } = await mcpRequest(
      "tools/call",
      { name: "get_split_strategy", arguments: {} },
      23,
      sessionId
    );

    const result = (parsed as { result: { content: Array<{ type: string; text: string }> } }).result;
    expect(result.content[0].text).toContain("ASSIGN_GROUP_TO_ITEM");
    expect(result.content[0].text).toContain("COMPUTE_WEIGHTS");
  });

  it("call resolve_fair_go_link rejects invalid key format", async () => {
    const { parsed } = await mcpRequest(
      "tools/call",
      { name: "resolve_fair_go_link", arguments: { key: "short" } },
      24,
      sessionId
    );

    const result = (parsed as { result: { content: Array<{ type: string; text: string }>; isError?: boolean } }).result;
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("10");
  });
});

// ─── Prompts ─────────────────────────────────────────────────────

describe("Prompts", () => {
  let sessionId: string;

  beforeAll(async () => {
    sessionId = await establishSession();
  });

  it("prompts/list returns both prompts", async () => {
    const { parsed } = await mcpRequest("prompts/list", {}, 30, sessionId);
    const result = (parsed as { result: { prompts: Array<{ name: string }> } }).result;
    const names = result.prompts.map((p) => p.name).sort();

    expect(names).toEqual(["split-expenses", "split-receipt"]);
  });

  it("prompts/get split-receipt returns user message", async () => {
    const { parsed } = await mcpRequest(
      "prompts/get",
      { name: "split-receipt" },
      31,
      sessionId
    );

    const result = (parsed as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } }).result;
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content.text).toContain("receipt");
  });

  it("prompts/get split-expenses with num_people includes count", async () => {
    const { parsed } = await mcpRequest(
      "prompts/get",
      { name: "split-expenses", arguments: { num_people: "4" } },
      32,
      sessionId
    );

    const result = (parsed as { result: { messages: Array<{ role: string; content: { type: string; text: string } }> } }).result;
    expect(result.messages[0].content.text).toContain("4");
  });
});
