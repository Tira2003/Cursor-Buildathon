import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";

export const MAX_CALLS_PER_MINUTE = 20;

export class ApiRateLimitError extends Error {
  constructor(provider: "groq" | "serper") {
    super(
      `Rate limit: max ${MAX_CALLS_PER_MINUTE} ${provider} API calls per minute. Wait and retry.`,
    );
    this.name = "ApiRateLimitError";
  }
}

/** Enforces per-minute caps via Convex DB (shared across action invocations). */
export async function acquireApiSlot(
  ctx: ActionCtx,
  provider: "groq" | "serper",
): Promise<void> {
  const allowed = await ctx.runMutation(internal.apiRateLimitInternal.acquireSlot, {
    provider,
  });
  if (!allowed) {
    throw new ApiRateLimitError(provider);
  }
}
