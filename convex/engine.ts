"use node";

import { action } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Unified entry point: incident + what-if → saved simulation with phase-1 timeline.
 * Wraps createDraft, setGenerating, and generatePhaseOne.
 */
export const generateFromWhatIf = action({
  args: {
    incidentId: v.id("timelineIncidents"),
    whatIfPrompt: v.string(),
    originalTimelineId: v.optional(v.id("predefinedTimelines")),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    simulationId: v.id("simulations"),
    usedDemoFallback: v.optional(v.boolean()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    simulationId: Id<"simulations">;
    usedDemoFallback?: boolean;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmed = args.whatIfPrompt.trim();
    if (trimmed.length < 5) {
      throw new Error("What-if prompt must be at least 5 characters.");
    }

    const simulationId = await ctx.runMutation(api.simulations.createDraft, {
      source: "curated",
      originalTimelineId: args.originalTimelineId,
      changedIncidentId: args.incidentId,
      whatIfPrompt: trimmed,
    });

    await ctx.runMutation(api.simulations.setGenerating, { simulationId });

    const result = await ctx.runAction(api.actions.generatePhaseOne.run, {
      simulationId,
      demo: args.demo,
    });

    return {
      simulationId,
      usedDemoFallback: result.usedDemoFallback,
    };
  },
});

/**
 * Remix a curated (or museum) simulation with a new what-if and run phase-1 generation.
 */
export const remixFromSimulation = action({
  args: {
    originalSimulationId: v.id("simulations"),
    whatIfPrompt: v.string(),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    simulationId: v.id("simulations"),
    usedDemoFallback: v.optional(v.boolean()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    simulationId: Id<"simulations">;
    usedDemoFallback?: boolean;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmed = args.whatIfPrompt.trim();
    if (trimmed.length < 5) {
      throw new Error("What-if prompt must be at least 5 characters.");
    }

    const original = await ctx.runQuery(api.simulations.get, {
      simulationId: args.originalSimulationId,
    });
    if (!original) {
      throw new Error("Original simulation not found or not accessible");
    }

    const remixedSimulationId = await ctx.runMutation(api.remix.start, {
      originalSimulationId: args.originalSimulationId,
      newWhatIfPrompt: trimmed,
      source: original.source,
    });

    await ctx.runMutation(api.simulations.setGenerating, { simulationId: remixedSimulationId });

    if (original.source === "museum") {
      if (!original.selectedDurationId) {
        throw new Error("Museum simulation is missing duration context for remix");
      }

      await ctx.runAction(api.actions.generateTimelineFromDuration.run, {
        simulationId: remixedSimulationId,
        durationId: original.selectedDurationId,
        demo: args.demo,
      });

      void ctx.runAction(api.actions.fetchSimulationEventImages.fetchForSimulation, {
        simulationId: remixedSimulationId,
      });

      return { simulationId: remixedSimulationId };
    }

    const result = await ctx.runAction(api.actions.generatePhaseOne.run, {
      simulationId: remixedSimulationId,
      demo: args.demo,
    });

    return {
      simulationId: remixedSimulationId,
      usedDemoFallback: result.usedDemoFallback,
    };
  },
});
