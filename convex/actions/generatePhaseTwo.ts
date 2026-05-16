"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker, mergeApiUsage } from "../lib/apiUsage";
import { demoPhase2 } from "../seed/demoData";
import { isDemoMode } from "../lib/demo";
import { pickDemoPhase2 } from "../lib/demoFixtures";
import { generateJson } from "../lib/groq";
import { isLlmQuotaError } from "../lib/llmErrors";

const phase2Schema = `Return JSON: {
  "globalConsequence": [{ "year": string, "title": string, "description": string, "impactLevel": "low"|"medium"|"high" }],
  "lostToHistory": string[],
  "gainedByHumanity": string[],
  "relicPrompt": string
}. Use exactly 2 globalConsequence events.`;

export const run = action({
  args: {
    simulationId: v.id("simulations"),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean(), usedDemoFallback: v.optional(v.boolean()) }),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.simulationsInternal.getGenerationContext, {
      simulationId: args.simulationId,
    });
    if (!context) throw new Error("Simulation context not found");

    const fixtureCtx = {
      timelineSlug: context.timelineSlug,
      incidentTitle: context.incidentTitle,
      incidentYear: context.incidentYear,
    };

    const applyDemo = async () => {
      const fixtures = pickDemoPhase2(fixtureCtx);
      await ctx.runMutation(internal.simulationsInternal.patchPhase2, {
        simulationId: args.simulationId,
        ...fixtures,
      });
    };

    if (isDemoMode(args.demo)) {
      await applyDemo();
      return { ok: true };
    }

    const tracker = new ApiCallTracker();

    const runEnrich = async () => {
      try {
        const result = await ctx.runAction(api.actions.enrichTimelineImages.run, {
          simulationId: args.simulationId,
          which: "phase2",
          demo: args.demo,
        });
        tracker.incrementSerper(result.serperCalls);
      } catch (err) {
        console.warn("[AltEra] phase2 image enrich failed:", err);
      }
    };

    try {
      const data = await generateJson<typeof demoPhase2>(
        `You are an alternate-history engine. ${phase2Schema}. relicPrompt describes a museum artifact photo.`,
        `Incident: ${context.incidentTitle}
What if: ${context.whatIfPrompt}
Chosen branch: ${context.selectedBranchTitle ?? context.selectedBranchId}
Prior chaos: ${context.chaosScore ?? "unknown"}`,
        tracker,
        ctx,
      );

      await ctx.runMutation(internal.simulationsInternal.patchPhase2, {
        simulationId: args.simulationId,
        globalConsequence: data.globalConsequence,
        lostToHistory: data.lostToHistory,
        gainedByHumanity: data.gainedByHumanity,
        relicPrompt: data.relicPrompt,
      });
      await runEnrich();

      const existing = await ctx.runQuery(internal.simulationsInternal.getApiUsage, {
        simulationId: args.simulationId,
      });
      await ctx.runMutation(internal.simulationsInternal.patchApiUsage, {
        simulationId: args.simulationId,
        apiUsage: mergeApiUsage(existing ?? undefined, tracker.toUsage()),
      });

      return { ok: true };
    } catch (err) {
      if (isLlmQuotaError(err)) {
        console.warn(
          `[AltEra] Groq quota exceeded — using timeline demo phase 2 (${fixtureCtx.timelineSlug ?? "inferred"})`,
        );
        await applyDemo();
        await runEnrich();
        return { ok: true, usedDemoFallback: true };
      }
      throw err;
    }
  },
});
