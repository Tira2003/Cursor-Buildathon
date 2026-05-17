export const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
export const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const GROQ_RATES: Record<string, { inputPerMillion: number; outputPerMillion: number }> =
  {
    [GROQ_TEXT_MODEL]: { inputPerMillion: 0.59, outputPerMillion: 0.79 },
    [GROQ_VISION_MODEL]: { inputPerMillion: 0.11, outputPerMillion: 0.34 },
  };

/** Serper Dev: $1 per 1,000 image search requests */
export const SERPER_COST_PER_REQUEST = 0.001;

export function groqCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = GROQ_RATES[model] ?? GROQ_RATES[GROQ_TEXT_MODEL];
  return (
    (inputTokens / 1_000_000) * rates.inputPerMillion +
    (outputTokens / 1_000_000) * rates.outputPerMillion
  );
}

export function serperCostUsd(requestCount: number): number {
  return requestCount * SERPER_COST_PER_REQUEST;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

export const BILLING_RATE_LABELS = [
  {
    id: "groq-text",
    label: "Groq Llama 3.3 70B (text)",
    inputRate: "$0.59 / 1M input tokens",
    outputRate: "$0.79 / 1M output tokens",
  },
  {
    id: "groq-vision",
    label: "Groq Llama 4 Scout (vision)",
    inputRate: "$0.11 / 1M input tokens",
    outputRate: "$0.34 / 1M output tokens",
  },
  {
    id: "serper",
    label: "Serper image search",
    inputRate: "$1.00 / 1,000 requests",
    outputRate: "—",
  },
] as const;
