# fairgo-mcp

MCP (Model Context Protocol) server for [Fair Go](https://fairgo.app) — the expense splitter that handles what other apps can't: unequal portions, couples who settle together, kids who don't pay, and multi-currency tabs.

Connect this server to Claude, Cursor, VS Code, or any MCP-compatible AI assistant. Say "split a dinner bill" and Fair Go captures expenses conversationally and generates a shareable [fairgo.app](https://fairgo.app) link.

## Quick Start

### Claude.ai

Settings → Connectors → Add Custom Connector → paste:

```
https://mcp.fairgo.app/mcp
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fairgo": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.fairgo.app/mcp"]
    }
  }
}
```

### Cursor / VS Code / Other MCP Clients

Add `https://mcp.fairgo.app/mcp` as an MCP server.

## What It Does

The server exposes a 5-phase conversational workflow through 7 tools:

| Tool | Purpose |
|------|---------|
| `get_status` | Session orientation — server status + behavioral tip |
| `start_expense_split` | Conversational workflow for capturing expenses |
| `get_schema_reference` | CalculatorState v7 schema + annotated examples |
| `get_split_strategy` | Group-first split strategy for assigning who owes what |
| `fetch_exchange_rates` | Live rates for multi-currency splits |
| `create_fair_go_link` | Generate shareable fairgo.app link |
| `resolve_fair_go_link` | Check if a short link exists |

Plus 2 prompts (`split-receipt`, `split-expenses`) for clients with prompt-picker UIs.

### Instruction Architecture

The server uses a four-layer instruction-injection architecture to guide AI assistants through the workflow:

1. **`instructions` field** — FSM pseudocode delivered at connection time
2. **`get_status` tip** — behavioral guidance + self-install suggestion
3. **Rich tool descriptions** — keyword-rich for discoverability
4. **Tool responses** — phase-specific pseudocode delivered on demand

All tools are annotated (`readOnlyHint`, `destructiveHint`, `idempotentHint`) for auto-approval by MCP clients.

## Also Available As

- **Web app**: [fairgo.app](https://fairgo.app) — no account needed, everything encrypted in the browser
- **ChatGPT**: [Fair Go GPT](https://chatgpt.com/g/g-69bd0c3bd68081918f39a66d78317c93-fairgo-expense-split-calculator) — same workflow as a Custom GPT

## Development

```bash
npm install
npm run dev          # Start local server (wrangler dev)
npm test             # Run unit tests
npm run type-check   # TypeScript check
```

### Integration Tests

Integration tests run against a live local server:

```bash
npx wrangler dev --port 8799 &
npx vitest run test/integration/
```

### Deploy

```bash
./deploy.sh dev      # Deploy to dev (fairgo-mcp.nathaniel-ramm.workers.dev)
./deploy.sh prod     # Deploy to production (mcp.fairgo.app)
```

## Architecture

Cloudflare Worker using [`agents`](https://www.npmjs.com/package/agents) (McpAgent + Durable Objects) for MCP protocol session management. Proxies to the existing public [fairgo.app/api/encode](https://fairgo.app/api/encode) endpoint — no database, no auth, stateless beyond MCP protocol sessions.

## License

MIT
