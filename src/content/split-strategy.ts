/**
 * Phase 3 group-first split strategy pseudocode returned by the
 * `get_split_strategy` tool.
 *
 * Source of truth: fairgo/references/SPLIT_STRATEGY.md
 * Keep in sync with that file when the strategy changes.
 */

export const SPLIT_STRATEGY_CONTENT = `
# Fair Go Skill — Group-First Split Strategy

## Core Principle

Think in GROUPS first, not individual weights. Most real-world splits follow group patterns.

| Pattern | Example | What to do |
|---------|---------|------------|
| **Payers** | "I paid for everything" | Create Payers group with just that person |
| **Adults / Kids** | "Wine is adults only" | Create Adults and Kids groups |
| **Couples** | "The Smiths settle together" | Create group with \`financial: true\` |
| **Activity-based** | "Only divers pay for the boat" | Create a Divers group |

## Rules

1. When the user says who's involved in an item, create or reuse a group.
2. Within a group, default to equal splits (weight 1 for all members).
3. Only use per-person weights when explicitly unequal ("Bob had 2 beers, Alice had 1").
4. Assign groups to line items via \`consumptionGroupId\` / \`expenseGroupId\` **AND** set the \`included\` flags on individual splits to match. The splits array is the source of truth for calculations; group IDs are metadata for UI display. You MUST set both.

## Weights Are Proportions

- Equal split → all weight 1
- "Alice 2/3, Bob 1/3" → Alice weight 2, Bob weight 1
- "$60 Alice, $40 Bob" → Alice weight 3, Bob weight 2

\`\`\`pseudocode
ASSIGN_GROUP_TO_ITEM(lineItem, group, role):
  # role = "consumption" | "expense"
  IF role == "consumption":
    lineItem.consumptionGroupId = group.id
  ELIF role == "expense":
    lineItem.expenseGroupId = group.id

  # CRITICAL: Sync individual splits with group membership
  FOR person IN all_people:
    split = find_split(lineItem, person, role)
    IF person IN group.members:
      split.included = true
      split.weight = person.weight OR 1
    ELSE:
      split.included = false
      split.weight = 0

COMPUTE_WEIGHTS(amounts):
  # Convert dollar amounts to integer weight proportions
  # e.g. [$60, $40] -> [3, 2] (divide by GCD)
  cents = [round(a * 100) for a in amounts]
  divisor = gcd(cents)
  RETURN [c / divisor for c in cents]
\`\`\`

## Settlements (Paybacks)

If someone has already paid someone back, add a line item:
- Description: \`"Settlement: Bob -> Alice"\`
- Expense = payer (Bob) — only Bob has weight > 0 on expense side
- Consumption = receiver (Alice) — only Alice has weight > 0 on consumption side
- Everyone else: \`weight: 0, included: false\` on both sides

This reduces what the payer owes the receiver in the final calculation.
`.trim();
