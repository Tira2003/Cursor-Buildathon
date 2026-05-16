"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker, mergeApiUsage } from "../lib/apiUsage";
import { demoPhase1 } from "../seed/demoData";
import { isDemoMode } from "../lib/demo";
import { pickDemoPhase1 } from "../lib/demoFixtures";
import { generateJson } from "../lib/groq";
import { isLlmQuotaError } from "../lib/llmErrors";
import { normalizeBranchChoices } from "../lib/normalizeLlm";

const phase1Schema = `Return JSON: {
  "chaosScore": number 0-100,
  "immediateRipple": [{ "year": string, "title": string, "description": string, "impactLevel": "low"|"medium"|"high" }],
  "generationalShift": [{ "year": string, "title": string, "description": string, "impactLevel": "low"|"medium"|"high" }],
  "branchChoices": [{ "id": string, "title": string, "description": string, "chaosImpact": number }]
}. Use exactly 2 immediateRipple events and exactly 2 generationalShift events. Provide exactly 3 branchChoices.`;

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
      const fixtures = pickDemoPhase1(fixtureCtx);
      await ctx.runMutation(internal.simulationsInternal.patchPhase1, {
        simulationId: args.simulationId,
        chaosScore: fixtures.chaosScore,
        immediateRipple: fixtures.immediateRipple,
        generationalShift: fixtures.generationalShift,
        branchChoices: fixtures.branchChoices,
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
          which: "phase1",
          demo: args.demo,
        });
        tracker.incrementSerper(result.serperCalls);
      } catch (err) {
        console.warn("[AltEra] phase1 image enrich failed:", err);
      }
    };

    const currentSim = await ctx.runQuery(internal.simulationsInternal.getForEnrich, {
      simulationId: args.simulationId,
    });
    let remixLines = "";
    if (currentSim?.remixOfSimulationId) {
      const parentCtx = await ctx.runQuery(
        internal.simulationsInternal.getRemixParentContext,
        { remixOfSimulationId: currentSim.remixOfSimulationId },
      );
      if (parentCtx) {
        remixLines = `\nRemix of prior timeline. Parent what-if: ${parentCtx.whatIfPrompt}${
          parentCtx.selectedBranchTitle
            ? `\nParent branch taken: ${parentCtx.selectedBranchTitle}`
            : ""
        }`;
      }
    }

    try {
      const data = await generateJson<{
        chaosScore: number;
        immediateRipple: typeof demoPhase1.immediateRipple;
        generationalShift: typeof demoPhase1.generationalShift;
        branchChoices: typeof demoPhase1.branchChoices;
      }>(
        `You are an alternate-history engine. ${phase1Schema}. Be specific to the incident and what-if.`,
        `Incident (${context.incidentYear}): ${context.incidentTitle}
${context.incidentDescription}
Real outcome: ${context.realOutcome}
What if: ${context.whatIfPrompt}${remixLines}`,
        tracker,
        ctx,
      );

      await ctx.runMutation(internal.simulationsInternal.patchPhase1, {
        simulationId: args.simulationId,
        chaosScore: Math.min(100, Math.max(0, data.chaosScore)),
        immediateRipple: data.immediateRipple,
        generationalShift: data.generationalShift,
        branchChoices: normalizeBranchChoices(data.branchChoices),
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
          `[AltEra] Groq quota exceeded — using timeline demo fixtures (${fixtureCtx.timelineSlug ?? "inferred"})`,
        );
        await applyDemo();
        await runEnrich();
        return { ok: true, usedDemoFallback: true };
      }
      throw err;
    }
  },
});
