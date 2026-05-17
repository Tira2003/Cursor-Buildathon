import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { groqCostUsd, serperCostUsd } from "./lib/billingRates";
import { apiUsageFeature, apiUsageProvider } from "./validators";

export const getAuthenticatedUserId = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const recordUsage = internalMutation({
  args: {
    userId: v.id("users"),
    provider: apiUsageProvider,
    feature: apiUsageFeature,
    model: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    serperRequests: v.optional(v.number()),
    simulationId: v.optional(v.id("simulations")),
    museumScanId: v.optional(v.id("museumScans")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();

    let costUsd = 0;
    if (args.provider === "groq") {
      const inputTokens = args.inputTokens ?? 0;
      const outputTokens = args.outputTokens ?? 0;
      costUsd = groqCostUsd(args.model ?? "", inputTokens, outputTokens);
    } else {
      const requests = args.serperRequests ?? 0;
      costUsd = serperCostUsd(requests);
    }

    await ctx.db.insert("apiUsageEvents", {
      userId: args.userId,
      provider: args.provider,
      feature: args.feature,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      serperRequests: args.serperRequests,
      costUsd,
      simulationId: args.simulationId,
      museumScanId: args.museumScanId,
      createdAt: now,
    });

    const existing = await ctx.db
      .query("userUsageTotals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (args.provider === "groq") {
      const inputTokens = args.inputTokens ?? 0;
      const outputTokens = args.outputTokens ?? 0;
      if (existing) {
        await ctx.db.patch(existing._id, {
          groqInputTokens: existing.groqInputTokens + inputTokens,
          groqOutputTokens: existing.groqOutputTokens + outputTokens,
          groqCallCount: existing.groqCallCount + 1,
          groqCostUsd: existing.groqCostUsd + costUsd,
          totalCostUsd: existing.totalCostUsd + costUsd,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("userUsageTotals", {
          userId: args.userId,
          groqInputTokens: inputTokens,
          groqOutputTokens: outputTokens,
          groqCallCount: 1,
          groqCostUsd: costUsd,
          serperRequests: 0,
          serperCostUsd: 0,
          totalCostUsd: costUsd,
          updatedAt: now,
        });
      }
    } else {
      const requests = args.serperRequests ?? 0;
      if (existing) {
        await ctx.db.patch(existing._id, {
          serperRequests: existing.serperRequests + requests,
          serperCostUsd: existing.serperCostUsd + costUsd,
          totalCostUsd: existing.totalCostUsd + costUsd,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("userUsageTotals", {
          userId: args.userId,
          groqInputTokens: 0,
          groqOutputTokens: 0,
          groqCallCount: 0,
          groqCostUsd: 0,
          serperRequests: requests,
          serperCostUsd: costUsd,
          totalCostUsd: costUsd,
          updatedAt: now,
        });
      }
    }

    return null;
  },
});
