import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

import { INSTRUCTIONS } from "./content/instructions.js";
import { getStatusHandler } from "./tools/get-status.js";
import { startExpenseSplitHandler } from "./tools/start-expense-split.js";
import { getSchemaReferenceHandler } from "./tools/get-schema-reference.js";
import { getSplitStrategyHandler } from "./tools/get-split-strategy.js";
import { fetchExchangeRatesHandler } from "./tools/fetch-exchange-rates.js";
import { createFairGoLinkHandler } from "./tools/create-fair-go-link.js";
import { resolveFairGoLinkHandler } from "./tools/resolve-fair-go-link.js";
import { splitReceiptPrompt, splitExpensesPrompt } from "./prompts/index.js";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

const WRITE_SAFE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export class FairGoMCP extends McpAgent {
  server = new McpServer(
    { name: "fairgo-mcp", version: "1.0.0" },
    { instructions: INSTRUCTIONS }
  );

  async init() {
    // --- Orientation tool ---
    this.server.registerTool(
      "get_status",
      {
        title: "Fair Go Status",
        description:
          "Call this at the start of every session involving expense splitting, bill splitting, receipt splitting, or dividing costs among people. Returns server status and behavioral guidance for the Fair Go expense-splitting workflow.",
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => getStatusHandler() as any
    );

    // --- Workflow guidance tools ---
    this.server.registerTool(
      "start_expense_split",
      {
        title: "Split a Bill or Receipt",
        description:
          "Call when a user wants to split a bill, split a receipt, divide expenses, split costs, share a tab, calculate who owes what, or figure out how to split dinner/drinks/rent/travel costs among a group. Returns the conversational workflow pseudocode for capturing all details and generating a shareable fairgo.app link.",
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => startExpenseSplitHandler() as any
    );

    this.server.registerTool(
      "get_schema_reference",
      {
        title: "Fair Go Schema Reference",
        description:
          "Call when you are ready to build the CalculatorState JSON for an expense split (Phase 3–5). Returns the full v7 type definitions, field semantics, critical rules, and 5 annotated examples covering couples, kids, multi-currency, tips, and settlements.",
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => getSchemaReferenceHandler() as any
    );

    this.server.registerTool(
      "get_split_strategy",
      {
        title: "Fair Go Split Strategy",
        description:
          "Call when you have line items and people from a bill or receipt and need to assign who paid what and who consumed what (Phase 3). Returns the group-first split strategy pseudocode for handling couples, families, kids, unequal portions, and settlement paybacks.",
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => getSplitStrategyHandler() as any
    );

    // --- Exchange rates (external read) ---
    this.server.registerTool(
      "fetch_exchange_rates",
      {
        title: "Fetch Exchange Rates for Multi-Currency Split",
        description:
          "Fetch live exchange rates when splitting expenses across multiple currencies (e.g., dinner in EUR but settling in AUD). Returns rates already inverted for Fair Go convention (base units per 1 foreign unit).",
        inputSchema: {
          base: z.string().length(3),
          symbols: z.array(z.string().length(3)).min(1),
        },
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params) => fetchExchangeRatesHandler(params) as any
    );

    // --- API proxy tools ---
    this.server.registerTool(
      "create_fair_go_link",
      {
        title: "Generate Fair Go Shareable Link",
        description:
          "Generate a shareable fairgo.app link showing who owes whom from a split bill, receipt, or shared expenses. Takes a CalculatorState v7 JSON object and returns an encrypted short link. Call this after the user confirms the summary table. The link lets anyone view and edit the split.",
        inputSchema: {
          calculator_state: z.record(z.string(), z.unknown()),
        },
        annotations: WRITE_SAFE,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params) => createFairGoLinkHandler(params) as any
    );

    this.server.registerTool(
      "resolve_fair_go_link",
      {
        title: "Look Up Fair Go Link",
        description:
          "Check if a Fair Go expense-split link exists and is still valid. Accepts the 10-character key from a fairgo.app/s/{key} URL. Note: contents are encrypted and cannot be read server-side.",
        inputSchema: {
          key: z.string().length(10).regex(/^[a-zA-Z0-9]+$/),
        },
        annotations: READ_ONLY,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (params) => resolveFairGoLinkHandler(params) as any
    );

    // --- Prompts ---
    this.server.registerPrompt(
      "split-receipt",
      {
        description: "Start a receipt splitting workflow",
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => splitReceiptPrompt() as any
    );

    this.server.registerPrompt(
      "split-expenses",
      {
        description:
          "Start an expense splitting workflow with an optional number of people",
        argsSchema: {
          num_people: z.string().optional(),
        },
      },
      (args) =>
        splitExpensesPrompt({
          num_people: args.num_people
            ? parseInt(args.num_people, 10)
            : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any
    );
  }
}
