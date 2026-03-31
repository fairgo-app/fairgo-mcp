/**
 * Phase 1–2 conversational workflow pseudocode returned by the
 * `start_expense_split` tool.
 *
 * Source of truth: fairgo/references/WORKFLOW.md
 * Keep in sync with that file when the workflow changes.
 */

export const WORKFLOW_CONTENT = `
# Fair Go Skill — Conversational Workflow

Platform-neutral workflow for guiding a user through expense splitting.
Each distribution channel adapts the tool/action calls to its own mechanism.

## State Model

\`\`\`pseudocode
INIT_STATE():
  computed.rawInput = null
  computed.eventName = null
  computed.currency = "AUD"
  computed.people = []
  computed.lineItems = []
  computed.groups = []
  computed.multiCurrency = false
  computed.exchangeRates = []
  computed.checklist = {
    eventName: false, currency: false, people: false,
    lineItems: false, settlementGroups: false,
    otherExpenses: false, multiCurrency: false, groups: false
  }
  computed.link = null
  computed.state = null
\`\`\`

## Phase 1: Accept Initial Input

Parse whatever the user provides — from a vague "split a dinner bill" to a complete description with names, items, and amounts. If they provide a receipt image, extract all visible items and totals.

## Phase 2: Checklist Tracking

Track and display this checklist after each exchange:

\`\`\`
☐ Event name (e.g., "Friday Dinner")
☐ Currency (ISO 4217, default AUD — infer from locale or bill)
☐ People (minimum 2)
☐ Line items (minimum 1: description, amount, who paid, who consumed)
☐ Settlement groups — do any people settle together?
☐ Other shared expenses — taxis, drinks elsewhere, activities?
☐ Multi-currency — were any expenses in a different currency?
☐ Groups (couples, families, payers, adults/kids, activity-based)
\`\`\`

Mark items ☑ as captured. Ask for missing **required** items one at a time. Use multiple choice where sensible.

**Defaults:**
- Currency: AUD (infer from locale or bill, otherwise ask)
- Event name: infer from context, or ask
- Splits: if not specified, assume equal split (everyone paid equally, everyone shared equally)

### Probing for Group Dynamics

\`\`\`pseudocode
CHECK_SETTLEMENT_GROUPS(input):
  IF 2+ people share a surname OR input mentions couples/partners/families/housemates:
    ASK "Do [X] and [Y] settle together as a unit? (e.g., a couple who share finances)"
    IF yes: CREATE group with financial: true

  IF input mentions children/kids/babies:
    ASK "Which adult covers [child]'s share?"
    CREATE financial group linking child to parent

  IF group size >= 4:
    ASK "Is anyone here a couple or family who'd settle together?"
\`\`\`

### Probing for Other Expenses

After the main bill, always ask about other shared costs (taxis, drinks elsewhere, snacks). Capture each as a separate line item — they often have different payer/consumer splits.

### Multi-Currency Detection

\`\`\`pseudocode
CHECK_MULTI_CURRENCY(input):
  IF user mentions prices in different currencies
     OR event spans multiple countries
     OR user says "paid in euros" / "charged in USD" etc.:

    SET multiCurrency: true
    SET base currency to the user's home currency (or the most common one)
    FETCH live rates for all foreign currencies
    # CRITICAL: Invert the rates!
    # API returns "foreign units per 1 base unit"
    # Fair Go needs "base units per 1 foreign unit"
    FOR EACH (code, apiRate) in fetched_rates:
      fairGoRate = 1 / apiRate
      ADD { currency: code, rate: ROUND(fairGoRate, 4) } to exchangeRates
    SET per-item currency and fxRate on each foreign line item
    SET fxOverride: false (rate was fetched, not manually entered)

  # 30 supported currencies:
  # AUD, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR,
  # ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR
\`\`\`

## Phase 4: Confirm Before Generating

Show a formatted summary table:

\`\`\`
Dinner at The Local (USD)

People: Alice, Bob, Charlie
Groups: Alice & Bob (settle together)

 Item              Amount   Paid by   Consumed by
 ────────────────  ───────  ────────  ──────────────────────
 3 Craft Beers      $36.00  Alice     Alice (×2), Bob (×1)
 Steak              $42.00  Alice     Bob
 Shared Nachos      $22.00  Alice     Everyone equally
 ────────────────  ───────  ────────  ──────────────────────
 Total             $100.00
\`\`\`

Ask: "Does this look right? Want to change anything?"
If confirmed → Phase 5. If changes requested → update and re-show.

## Phase 5: Generate Link

Build the CalculatorState JSON silently (never show to user), generate the link, present it with next steps and the coffee nudge.

## Error Recovery

\`\`\`pseudocode
ON_ERROR(error):
  IF "version":     SET version: 7
  IF "amount":      CONVERT all amounts to strings
  IF 413:           REDUCE line items or people count
  IF 429:           WAIT then retry
  IF repeated failures OR link generation unavailable:
    OFFER manual JSON import fallback:
      "1. Copy the JSON below"
      "2. Go to fairgo.app"
      "3. Tap Import -> JSON tab"
      "4. Paste and load"
    DISPLAY the CalculatorState JSON (ONLY exception to "never show JSON" rule)
  ELSE: FIX based on error message, RETRY silently
\`\`\`
`.trim();
