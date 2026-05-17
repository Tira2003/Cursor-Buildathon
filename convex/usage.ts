import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { BILLING_RATE_LABELS, formatUsd } from "./lib/billingRates";
import { apiUsageFeature, apiUsageProvider } from "./validators";

const FEATURE_LABELS: Record<string, string> = {
  museum_analyze: "Museum artifact analysis",
  museum_durations: "Museum duration suggestions",
  timeline_generate: "Museum timeline generation",
  phase1: "Simulation phase 1",
  phase2: "Simulation phase 2",
  stabilize: "Timeline stabilization",
  incident_image: "Incident image search",
  simulation_event_image: "Story slide image search",
};

const emptyTotals = {
  groqInputTokens: 0,
  groqOutputTokens: 0,
  groqCallCount: 0,
  groqCostUsd: 0,
  serperRequests: 0,
  serperCostUsd: 0,
  totalCostUsd: 0,
  totalApiCalls: 0,
};

export const getMyUsageSummary = query({
  args: {},
  returns: v.object({
    totals: v.object({
      groqInputTokens: v.number(),
      groqOutputTokens: v.number(),
      groqCallCount: v.number(),
      groqCostUsd: v.number(),
      serperRequests: v.number(),
      serperCostUsd: v.number(),
      totalCostUsd: v.number(),
      totalApiCalls: v.number(),
    }),
    formatted: v.object({
      groqCost: v.string(),
      serperCost: v.string(),
      totalCost: v.string(),
    }),
    rateLabels: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        inputRate: v.string(),
        outputRate: v.string(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totals: emptyTotals,
        formatted: {
          groqCost: formatUsd(0),
          serperCost: formatUsd(0),
          totalCost: formatUsd(0),
        },
        rateLabels: BILLING_RATE_LABELS.map((r) => ({ ...r })),
      };
    }

    const totals = await ctx.db
      .query("userUsageTotals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const groqInputTokens = totals?.groqInputTokens ?? 0;
    const groqOutputTokens = totals?.groqOutputTokens ?? 0;
    const groqCallCount = totals?.groqCallCount ?? 0;
    const groqCostUsd = totals?.groqCostUsd ?? 0;
    const serperRequests = totals?.serperRequests ?? 0;
    const serperCostUsd = totals?.serperCostUsd ?? 0;
    const totalCostUsd = totals?.totalCostUsd ?? 0;

    return {
      totals: {
        groqInputTokens,
        groqOutputTokens,
        groqCallCount,
        groqCostUsd,
        serperRequests,
        serperCostUsd,
        totalCostUsd,
        totalApiCalls: groqCallCount + serperRequests,
      },
      formatted: {
        groqCost: formatUsd(groqCostUsd),
        serperCost: formatUsd(serperCostUsd),
        totalCost: formatUsd(totalCostUsd),
      },
      rateLabels: BILLING_RATE_LABELS.map((r) => ({ ...r })),
    };
  },
});

export const listMyUsageEvents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("apiUsageEvents"),
      provider: apiUsageProvider,
      feature: apiUsageFeature,
      featureLabel: v.string(),
      model: v.optional(v.string()),
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      serperRequests: v.optional(v.number()),
      costUsd: v.number(),
      costFormatted: v.string(),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.min(args.limit ?? 50, 100);
    const events = await ctx.db
      .query("apiUsageEvents")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return events.map((ev) => ({
      _id: ev._id,
      provider: ev.provider,
      feature: ev.feature,
      featureLabel: FEATURE_LABELS[ev.feature] ?? ev.feature,
      model: ev.model,
      inputTokens: ev.inputTokens,
      outputTokens: ev.outputTokens,
      serperRequests: ev.serperRequests,
      costUsd: ev.costUsd,
      costFormatted: formatUsd(ev.costUsd),
      createdAt: ev.createdAt,
    }));
  },
});
