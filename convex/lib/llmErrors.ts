/**
 * Rate-limit / quota detection for Groq (OpenAI-compatible) and legacy Gemini messages.
 *
 * Groq HTTP + error.code (from response body):
 * - 429 + code=rate_limit_exceeded — TPM/RPM limits
 * - 413 + code=context_length_exceeded — prompt too long
 * - 400 + code=json_validate_failed — invalid JSON schema/mode output
 * - 401 + type=invalid_request_error — bad/missing API key
 * - 500/503 — server overload (retry)
 */
export function isLlmRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("429") ||
    msg.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("Too Many Requests") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("limit: 0")
  );
}

/** @deprecated Use isLlmRateLimitError */
export const isGeminiQuotaError = isLlmRateLimitError;
