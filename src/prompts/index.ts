interface PromptMessage {
  role: "user";
  content: { type: "text"; text: string };
}

interface PromptResult {
  messages: PromptMessage[];
}

export function splitReceiptPrompt(): PromptResult {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "I have a receipt I'd like to split. Help me divide it fairly among the people involved.",
        },
      },
    ],
  };
}

export function splitExpensesPrompt(args: {
  num_people?: number;
}): PromptResult {
  const people = args.num_people
    ? `among ${args.num_people} people`
    : "among the people involved";
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Help me split expenses from a recent event ${people}.`,
        },
      },
    ],
  };
}
