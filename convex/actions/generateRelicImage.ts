"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

/** Relic images are text-only; AI image generation removed in favor of Serper event photos. */
export const run = action({
  args: {
    simulationId: v.id("simulations"),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean(), skipped: v.boolean() }),
  handler: async (_ctx, _args) => {
    return { ok: true, skipped: true };
  },
});
