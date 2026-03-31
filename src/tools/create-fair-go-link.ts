import type { CallToolResult } from "../types.js";

const ENCODE_URL = "https://fairgo.app/api/encode";

const SUCCESS_HINT =
  "Share this link with all participants — they can open it to see the full split. " +
  "The link is encrypted: the decryption key lives in the URL fragment and never touches any server. " +
  "Links expire after 90 days of inactivity. " +
  "☕ Fair Go is free. If it saved you an argument, consider buying the dev a coffee: https://ko-fi.com/fairgo";

const FIX_GUIDANCE =
  "Common fixes: ensure schema version is 7 (calculatorVersion: 7), " +
  "amounts must be strings not numbers (e.g. \"12.50\" not 12.50), " +
  "all personId references must match a person defined in the people array (referential integrity), " +
  "and every line item must have at least one split entry.";

const MANUAL_FALLBACK =
  "Network error — could not reach fairgo.app. " +
  "As a fallback you can import the state manually: go to https://fairgo.app, " +
  "open the import dialog, and paste the CalculatorState JSON directly.";

export async function createFairGoLinkHandler(args: {
  calculator_state: Record<string, unknown>;
}): Promise<CallToolResult> {
  const { calculator_state } = args;

  let response: Response;
  try {
    response = await fetch(ENCODE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(calculator_state),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `${MANUAL_FALLBACK}\n\nDetails: ${message}`,
        },
      ],
    };
  }

  if (response.status === 201) {
    const data = (await response.json()) as { url?: string; fallback?: string };
    const result = {
      url: data.url,
      fallback: data.fallback,
      hint: SUCCESS_HINT,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  // Non-201 response — surface the error with fix guidance
  let errorBody: string;
  try {
    const raw = await response.json();
    errorBody = typeof raw === "string" ? raw : JSON.stringify(raw);
  } catch {
    errorBody = await response.text().catch(() => response.statusText);
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Encode failed (${response.status}): ${errorBody}\n\n${FIX_GUIDANCE}`,
      },
    ],
  };
}
