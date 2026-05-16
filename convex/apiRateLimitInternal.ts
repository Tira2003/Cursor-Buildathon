import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { MAX_CALLS_PER_MINUTE } from "./lib/rateLimit";

const WINDOW_MS = 60_000;

export const acquireSlot = internalMutation({
  args: {
    provider: v.union(v.literal("groq"), v.literal("serper")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const since = Date.now() - WINDOW_MS;
    const recent = await ctx.db
      .query("apiCallLog")
      .withIndex("by_provider_time", (q) =>
        q.eq("provider", args.provider).gte("createdAt", since),
      )
      .collect();

    if (recent.length >= MAX_CALLS_PER_MINUTE) {
      return false;
    }

    await ctx.db.insert("apiCallLog", {
      provider: args.provider,
      createdAt: Date.now(),
    });
    return true;
  },
});
