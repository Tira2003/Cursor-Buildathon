"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker } from "../lib/apiUsage";
import { isDemoMode } from "../lib/demo";
import {
  enrichSimulationImages,
  loadEnrichContext,
  type EnrichWhich,
} from "../lib/enrichEvents";

export const run = action({
  args: {
    simulationId: v.id("simulations"),
    which: v.union(
      v.literal("phase1"),
      v.literal("phase2"),
      v.literal("museum"),
      v.literal("all"),
    ),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    skipped: v.optional(v.boolean()),
    enriched: v.number(),
    failed: v.number(),
    serperCalls: v.number(),
  }),
  handler: async (ctx, args) => {
    if (isDemoMode(args.demo)) {
      return { ok: true, skipped: true, enriched: 0, failed: 0, serperCalls: 0 };
    }

    const sim = await ctx.runQuery(internal.simulationsInternal.getForEnrich, {
      simulationId: args.simulationId,
    });
    if (!sim) throw new Error("Simulation not found");

    const contextHint = sim.incidentTitle;
    const tracker = new ApiCallTracker();

    const enrichCtx = await loadEnrichContext(ctx, {
      incidentId: sim.changedIncidentId,
      museumScanId: sim.museumScanId,
      parentSimulationId: sim.remixOfSimulationId,
    });

    try {
      const result = await enrichSimulationImages(
        ctx,
        sim,
        args.which as EnrichWhich,
        contextHint,
        enrichCtx,
        tracker,
      );

      const hasPatch =
        result.immediateRipple !== undefined ||
        result.generationalShift !== undefined ||
        result.globalConsequence !== undefined ||
        result.events !== undefined;

      if (hasPatch) {
        await ctx.runMutation(internal.simulationsInternal.patchEventImages, {
          simulationId: args.simulationId,
          immediateRipple: result.immediateRipple,
          generationalShift: result.generationalShift,
          globalConsequence: result.globalConsequence,
          events: result.events,
        });
      }

      return {
        ok: true,
        enriched: result.totalEnriched,
        failed: result.totalFailed,
        serperCalls: result.serperCalls,
      };
    } catch (err) {
      console.warn(
        "[AltEra] enrichTimelineImages failed:",
        err instanceof Error ? err.message : err,
      );
      return { ok: true, skipped: true, enriched: 0, failed: 0, serperCalls: 0 };
    }
  },
});
