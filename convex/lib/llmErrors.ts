/** True when the LLM provider hit rate limits or quota (429 / RESOURCE_EXHAUSTED). */
export function isLlmQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("Too Many Requests") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate_limit") ||
    msg.includes("limit: 0") ||
    msg.includes("Rate limit") ||
    msg.includes("insufficient_quota") ||
    msg.includes("Rate limit: max") ||
    (error instanceof Error && error.name === "ApiRateLimitError")
  );
}

/** Groq/content-policy refusals (distinct from Gemini safetySettings). */
export function isLlmContentBlockedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("content_policy") ||
    msg.includes("content policy") ||
    msg.includes("safety") ||
    msg.includes("blocked")
  );
}
