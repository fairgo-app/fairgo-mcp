import type { CallToolResult } from "../types.js";

const KEY_PATTERN = /^[a-zA-Z0-9]{10}$/;

const FOUND_HINT =
  "This link exists and is valid. Note: the CalculatorState inside is encrypted — " +
  "the decryption key lives in the URL fragment (the part after #) and never leaves the client. " +
  "Direct the user to open the full URL (including the fragment) in their browser to decrypt the state.";

export async function resolveFairGoLinkHandler(args: {
  key: string;
}): Promise<CallToolResult> {
  const { key } = args;

  if (!KEY_PATTERN.test(key)) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Invalid key format: "${key}". Keys must be exactly 10 alphanumeric characters (a-z, A-Z, 0-9).`,
        },
      ],
    };
  }

  const url = `https://fairgo.app/api/resolve/${key}`;

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
          text: `Failed to reach fairgo.app: ${message}`,
        },
      ],
    };
  }

  if (response.ok) {
    const result = {
      status: "found",
      key,
      hint: FOUND_HINT,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }

  if (response.status === 404) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Link not found: key "${key}" has either expired (90-day TTL) or doesn't exist. Ask the user to re-share a fresh Fair Go link.`,
        },
      ],
    };
  }

  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Resolve failed (${response.status}): key "${key}" has either expired (90-day TTL) or doesn't exist.`,
      },
    ],
  };
}
