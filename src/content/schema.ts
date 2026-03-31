/**
 * CalculatorState v7 schema reference returned by the
 * `get_schema_reference` tool.
 *
 * Source of truth: fairgo/references/SCHEMA.md
 * Keep in sync with that file when the schema changes.
 * When bumping CALCULATOR_VERSION, update SCHEMA.md and this module together.
 */

export const SCHEMA_CONTENT = `
# CalculatorState v7 Schema Reference

## Type Definitions

\`\`\`typescript
interface CalculatorState {
  version: 7;                    // always 7
  eventName: string;             // e.g., "Friday Dinner"
  currency: string;              // ISO 4217, e.g., "AUD"
  people: CalculatorPerson[];    // minimum 2
  lineItems: CalculatorLineItem[]; // minimum 1
  groups: CalculatorGroup[];     // can be empty []
}

interface CalculatorPerson {
  id: string;    // e.g., "p1", "p2" — any unique string
  name: string;
}

interface CalculatorLineItem {
  id: string;                    // e.g., "li1", "li2"
  description: string;
  amount: string;                // MUST be a string, e.g., "25.00" NOT 25
  expenseSplits: CalculatorSplit[];       // who PAID — one entry per person in event
  consumptionSplits: CalculatorSplit[];   // who CONSUMED — one entry per person in event
  expenseGroupId?: string | null;        // group ID if a group paid
  consumptionGroupId?: string | null;    // group ID if a group consumed
  isTipLineItem?: boolean;               // true for tip items
}

interface CalculatorSplit {
  personId: string;              // must match a person's id
  weight: number;                // financial share: 0 = none, 1 = one share, 2 = double
  included: boolean;             // whether this person is displayed on this item in the UI
}

interface CalculatorGroup {
  id: string;                    // e.g., "g1"
  name: string;                  // e.g., "Payers", "Adults"
  memberIds: string[];           // minimum 2 person IDs
  financial: boolean;            // true = settle together as a unit
}
\`\`\`

## Critical Rules

1. **Every line item MUST have a split entry for EVERY person in the event** — not just participants.

2. **\`amount\` MUST be a string** — \`"25.00"\` not \`25\`. The encoder will coerce numbers but the schema expects strings.

3. **\`expenseSplits\`** = who PAID for this item. **\`consumptionSplits\`** = who BENEFITED from this item. These are different concepts:
   - "Alice paid for the pizza, split between everyone" → expense: Alice only, consumption: everyone
   - "We all chipped in for the wine" → expense: everyone, consumption: everyone

4. **IDs must be unique and consistent** — use \`p1\`, \`p2\` for people, \`li1\`, \`li2\` for line items, \`g1\`, \`g2\` for groups.

5. **\`version\` must be \`7\`** — always.

## Field Reference

**\`CalculatorSplit\` fields:**

| Field | Meaning | Effect |
|-------|---------|--------|
| \`included\` | Whether this person is **displayed** on this item in the UI | \`false\` = person is hidden from this item entirely |
| \`weight\` | The person's **financial share** of this item, relative to others | \`0\` = no financial share, \`1\` = one share, \`2\` = double share |

**How \`included\` and \`weight\` work together:**
- "Bob had the steak" → Bob: \`included: true, weight: 1\`. Everyone else: \`included: false, weight: 0\`.
- "Alice had 2 beers, Bob had 1" → Alice: \`included: true, weight: 2\`. Bob: \`included: true, weight: 1\`. Others: \`included: false, weight: 0\`.
- "We shared the nachos equally" → Everyone: \`included: true, weight: 1\`.
- Non-consumers should have **both** \`included: false\` AND \`weight: 0\` — they are not displayed and have no financial share.

## Example: Pub Dinner — Couple Settlement, Individual Items, Unequal Quantities

Alice and Bob are a couple who settle together. Alice paid the whole bill. 3 beers: Alice had 2, Bob had 1, Charlie had none. Each person ordered their own main. Nachos were shared equally.

**Key patterns demonstrated:**
- **Financial group** — Alice & Bob settle together (\`financial: true\`), so the calculator shows what "Alice & Bob" owe as a unit vs what Charlie owes
- **Non-AUD currency** — \`"currency": "USD"\`
- **Unequal weights** on the beers (Alice weight 2, Bob weight 1)
- **Single-person consumption** on individual mains (only one person \`included: true\`)
- **Equal shared consumption** on the nachos (everyone \`included: true\`, weight 1)
- **Single payer** (Alice pays everything)

\`\`\`json
{
  "version": 7,
  "eventName": "Dinner at The Local",
  "currency": "USD",
  "people": [
    { "id": "p1", "name": "Alice" },
    { "id": "p2", "name": "Bob" },
    { "id": "p3", "name": "Charlie" }
  ],
  "lineItems": [
    {
      "id": "li1",
      "description": "3 Craft Beers",
      "amount": "36.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 2, "included": true },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 0, "included": false }
      ]
    },
    {
      "id": "li2",
      "description": "Steak (Bob's)",
      "amount": "42.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 0, "included": false },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 0, "included": false }
      ]
    },
    {
      "id": "li3",
      "description": "Shared Nachos",
      "amount": "22.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 1, "included": true }
      ]
    },
    {
      "id": "li4",
      "description": "Fish & Chips (Alice's)",
      "amount": "28.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ]
    },
    {
      "id": "li5",
      "description": "Pasta (Charlie's)",
      "amount": "26.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 0, "included": false },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 1, "included": true }
      ]
    }
  ],
  "groups": [
    { "id": "g1", "name": "Alice & Bob", "memberIds": ["p1", "p2"], "financial": true }
  ]
}
\`\`\`

## Example: Family Dinner — Groups, Unequal Payment, Mixed Consumption

4 people: Alice, Bob (couple who settle together), Charlie, Diana (child). Alice paid 2/3, Charlie paid 1/3. 4 wines: Alice had 1, Bob had 1, Charlie had 2. Diana had a kids meal. Tip split by everyone.

**Key patterns demonstrated:**
- **Unequal expense weights** (Alice weight 2, Charlie weight 1 = 2/3 and 1/3 payment)
- **Financial group** (Alice & Bob settle together as "The Smiths")
- **Payers group** for expense side
- **Unequal consumption weights** on wines (Charlie weight 2, others weight 1)
- **Single-person consumption** on kids meal (Diana only)
- **Tip line item** with \`isTipLineItem: true\`

\`\`\`json
{
  "version": 7,
  "eventName": "Friday Dinner",
  "currency": "AUD",
  "people": [
    { "id": "p1", "name": "Alice" },
    { "id": "p2", "name": "Bob" },
    { "id": "p3", "name": "Charlie" },
    { "id": "p4", "name": "Diana" }
  ],
  "lineItems": [
    {
      "id": "li1",
      "description": "Shared appetiser",
      "amount": "45.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 2, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 1, "included": true }
      ],
      "expenseGroupId": "g1"
    },
    {
      "id": "li2",
      "description": "4 Wines",
      "amount": "56.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 2, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 2, "included": true },
        { "personId": "p4", "weight": 0, "included": false }
      ],
      "expenseGroupId": "g1",
      "consumptionGroupId": "g3"
    },
    {
      "id": "li3",
      "description": "Kids meal",
      "amount": "15.00",
      "expenseSplits": [
        { "personId": "p1", "weight": 2, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 0, "included": false },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 0, "included": false },
        { "personId": "p4", "weight": 1, "included": true }
      ],
      "expenseGroupId": "g1"
    },
    {
      "id": "li4",
      "description": "Tip",
      "amount": "15.00",
      "isTipLineItem": true,
      "expenseSplits": [
        { "personId": "p1", "weight": 2, "included": true },
        { "personId": "p2", "weight": 0, "included": false },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 0, "included": false }
      ],
      "consumptionSplits": [
        { "personId": "p1", "weight": 1, "included": true },
        { "personId": "p2", "weight": 1, "included": true },
        { "personId": "p3", "weight": 1, "included": true },
        { "personId": "p4", "weight": 1, "included": true }
      ],
      "expenseGroupId": "g1"
    }
  ],
  "groups": [
    { "id": "g1", "name": "Payers", "memberIds": ["p1", "p3"], "financial": false },
    { "id": "g2", "name": "The Smiths", "memberIds": ["p1", "p2"], "financial": true },
    { "id": "g3", "name": "Adults", "memberIds": ["p1", "p2", "p3"], "financial": false }
  ]
}
\`\`\`
`.trim();
