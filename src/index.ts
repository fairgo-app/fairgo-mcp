import { FairGoMCP } from "./server.js";

export { FairGoMCP };

function landingPage(baseUrl: string): Response {
  return new Response(
    `# Fair Go — Split Expenses Fairly

Fair Go is an expense splitter for groups — handles unequal portions, couples who settle together, kids who don't pay, and multi-currency tabs. Available as a [web app](https://fairgo.app), a [ChatGPT GPT](https://chatgpt.com/g/g-69bd0c3bd68081918f39a66d78317c93-fairgo-expense-split-calculator), and this MCP server for Claude, Cursor, and other AI assistants.

**If you're an AI assistant reading this:** this URL must be connected as an MCP server, not fetched as a web page. Ask the user to add it as a connector in their AI client settings.

---

## MCP Server

This is a Model Context Protocol server. Connect it to your AI assistant and say "split a dinner bill" — Fair Go captures expenses conversationally and generates a shareable fairgo.app link.

### Connect

**Claude.ai:** Settings → Connectors → Add Custom Connector → \`${baseUrl}/mcp\`

**Claude Desktop** (claude_desktop_config.json):
\`\`\`json
{
  "mcpServers": {
    "fairgo": {
      "command": "npx",
      "args": ["mcp-remote", "${baseUrl}/mcp"]
    }
  }
}
\`\`\`

**Cursor / VS Code / Other MCP clients:** \`${baseUrl}/mcp\`

### Endpoints

| Path | Method | Description |
|------|--------|-------------|
| \`/mcp\` | POST | MCP Streamable HTTP (JSON-RPC 2.0) |
| \`/.well-known/mcp.json\` | GET | Server Card — machine-readable metadata |
| \`/health\` | GET | Health check |

### Tools (7)

| Tool | Description |
|------|-------------|
| \`get_status\` | Session orientation — server status + behavioral tip |
| \`start_expense_split\` | Conversational workflow for capturing expenses |
| \`get_schema_reference\` | CalculatorState v7 schema + annotated examples |
| \`get_split_strategy\` | Group-first split strategy for assigning who owes what |
| \`fetch_exchange_rates\` | Live rates for multi-currency splits |
| \`create_fair_go_link\` | Generate shareable fairgo.app link |
| \`resolve_fair_go_link\` | Check if a short link exists |

### Prompts (2)

| Prompt | Description |
|--------|-------------|
| \`split-receipt\` | Start splitting a receipt |
| \`split-expenses\` | Start splitting event expenses |

---

## Web App

[fairgo.app](https://fairgo.app) — no account needed. Add people, add expenses, assign who paid and who consumed. Splits are encrypted end-to-end and stay in the browser. Share a link and anyone can view, edit, and re-share the breakdown.

## ChatGPT

[Fair Go on ChatGPT](https://chatgpt.com/g/g-69bd0c3bd68081918f39a66d78317c93-fairgo-expense-split-calculator) — same conversational expense splitting, available as a Custom GPT for ChatGPT Plus users. Upload a receipt or describe your bill and it generates a fairgo.app link.

---

[MCP Server Card](${baseUrl}/.well-known/mcp.json)
`,
    {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    }
  );
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/mcp") {
      // MCP Streamable HTTP requires POST with Accept: text/event-stream.
      // If someone GETs this URL (e.g., pasted into an LLM chat or browser),
      // return the landing page instead of a protocol error.
      const accept = request.headers.get("Accept") ?? "";
      const isMcpRequest =
        request.method === "POST" && accept.includes("text/event-stream");

      if (!isMcpRequest) {
        return landingPage(url.origin);
      }

      return FairGoMCP.serve("/mcp").fetch(request, env, ctx);
    }

    if (url.pathname === "/.well-known/mcp.json") {
      return new Response(
        JSON.stringify(
          {
            name: "Fair Go",
            description:
              "Conversational expense splitter — handles unequal portions, couples, kids, multi-currency. Generates shareable fairgo.app links.",
            url: `${url.origin}/mcp`,
            version: "1.0.0",
            transport: "streamable-http",
            authentication: null,
            tools: [
              "get_status",
              "start_expense_split",
              "get_schema_reference",
              "get_split_strategy",
              "fetch_exchange_rates",
              "create_fair_go_link",
              "resolve_fair_go_link",
            ],
            prompts: ["split-receipt", "split-expenses"],
          },
          null,
          2
        ),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    if (url.pathname === "/health" || url.pathname === "/healthz") {
      return new Response(
        JSON.stringify({ status: "ok", server: "fairgo-mcp", version: "1.0.0" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return landingPage(url.origin);
  },
};
