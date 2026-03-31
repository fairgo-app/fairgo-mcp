import type { CallToolResult } from "../types.js";

const RATE_HINT =
  "Rates are already inverted for Fair Go: each rate = base units per 1 foreign unit. " +
  "Pass these directly into the CalculatorState exchangeRates array. " +
  "Example: if base=AUD and symbol=USD, rate ~1.55 means 1 USD costs ~1.55 AUD.";

export async function fetchExchangeRatesHandler(args: {
  base: string;
  symbols: string[];
}): Promise<CallToolResult> {
  const { base, symbols } = args;

  if (!symbols || symbols.length === 0) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: "symbols must be a non-empty array of currency codes.",
        },
      ],
    };
  }

  const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}&symbols=${symbols.join(",")}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Failed to reach Frankfurter API: ${message}`,
        },
      ],
    };
  }

  if (!response.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Frankfurter API returned ${response.status} ${response.statusText}`,
        },
      ],
    };
  }

  const data = (await response.json()) as {
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  const exchangeRates = Object.entries(data.rates).map(
    ([currency, apiRate]) => ({
      currency,
      rate: Math.round((1 / apiRate) * 10000) / 10000,
    })
  );

  const result = {
    base: data.base,
    date: data.date,
    exchangeRates,
    hint: RATE_HINT,
  };

  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
}
