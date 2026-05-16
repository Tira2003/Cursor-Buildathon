"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker } from "../lib/apiUsage";
import { apiUsage as apiUsageValidator } from "../validators";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJson } from "../lib/groq";
import { isLlmQuotaError } from "../lib/llmErrors";
import { normalizeTimelineEvents } from "../lib/normalizeLlm";
import type { TimelineEvent } from "../types/contracts";

export const run = action({
  args: {
    simulationId: v.id("simulations"),
    durationId: v.string(),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    apiUsage: v.optional(apiUsageValidator),
  }),
  handler: async (ctx, args) => {
    const tracker = new ApiCallTracker();

    const runEnrich = async () => {
      try {
        const result = await ctx.runAction(api.actions.enrichTimelineImages.run, {
          simulationId: args.simulationId,
          which: "museum",
          demo: args.demo,
        });
        tracker.incrementSerper(result.serperCalls);
        return result;
      } catch (err) {
        console.error("[AltEra] museum image enrich failed:", err);
        throw err;
      }
    };

    if (isDemoMode(args.demo)) {
      const t = demoMuseum.timeline;
      await ctx.runMutation(internal.simulationsInternal.patchMuseumTimeline, {
        simulationId: args.simulationId,
        chaosScore: t.chaosScore,
        events: t.events as TimelineEvent[],
        lostToHistory: t.lostToHistory,
        gainedByHumanity: t.gainedByHumanity,
        relicPrompt: t.relicPrompt,
      });
      return { ok: true };
    }

    const applyDemo = async () => {
      const t = demoMuseum.timeline;
      await ctx.runMutation(internal.simulationsInternal.patchMuseumTimeline, {
        simulationId: args.simulationId,
        chaosScore: t.chaosScore,
        events: t.events as TimelineEvent[],
        lostToHistory: t.lostToHistory,
        gainedByHumanity: t.gainedByHumanity,
        relicPrompt: t.relicPrompt,
      });
    };

    const museumCtx = await ctx.runQuery(
      internal.simulationsInternal.getMuseumGenerationContext,
      { simulationId: args.simulationId },
    );
    if (!museumCtx) throw new Error("Museum context not found");

    tracker.addFrom(museumCtx.scanApiUsage);

    const durationLabel =
      museumCtx.selectedDurationLabel ?? args.durationId;

    const simForEnrich = await ctx.runQuery(internal.simulationsInternal.getForEnrich, {
      simulationId: args.simulationId,
    });
    let remixLines = "";
    if (simForEnrich?.remixOfSimulationId) {
      const parentCtx = await ctx.runQuery(
        internal.simulationsInternal.getMuseumRemixParentContext,
        { remixOfSimulationId: simForEnrich.remixOfSimulationId },
      );
      if (parentCtx) {
        remixLines = `\nRemix of prior museum timeline for "${parentCtx.artifactName}".`;
        if (parentCtx.selectedDurationLabel) {
          remixLines += ` Parent span: ${parentCtx.selectedDurationLabel}.`;
        }
        if (parentCtx.eventTitlesSummary) {
          remixLines += ` Prior events: ${parentCtx.eventTitlesSummary}.`;
        }
      }
    }

    const userPrompt = `Museum artifact: ${museumCtx.extractedArtifactName}
Label text: ${museumCtx.extractedLabelText}
Estimated era: ${museumCtx.extractedEra ?? "unknown"}
Historical context: ${museumCtx.historicalContext ?? "none"}
Timeline span: ${durationLabel} (${args.durationId})${remixLines}

Generate an alternate history timeline branching from this artifact.`;

    try {
      const data = await generateJson<{
        chaosScore: number;
        events: typeof demoMuseum.timeline.events;
        lostToHistory: string[];
        gainedByHumanity: string[];
        relicPrompt: string;
      }>(
        `Generate alternate timeline JSON: { chaosScore, events[{ year, title, description, impactLevel }], lostToHistory[], gainedByHumanity[], relicPrompt }. Include exactly 6–8 events spanning the chosen duration. impactLevel must be exactly "low", "medium", or "high" (strings, not numbers).`,
        userPrompt,
        tracker,
        ctx,
      );

      const events = normalizeTimelineEvents(data.events) as TimelineEvent[];

      await ctx.runMutation(internal.simulationsInternal.patchMuseumTimeline, {
        simulationId: args.simulationId,
        chaosScore: data.chaosScore,
        events,
        lostToHistory: data.lostToHistory,
        gainedByHumanity: data.gainedByHumanity,
        relicPrompt: data.relicPrompt,
      });

      await runEnrich();

      const usage = tracker.toUsage();
      await ctx.runMutation(internal.simulationsInternal.patchApiUsage, {
        simulationId: args.simulationId,
        apiUsage: usage,
      });

      return { ok: true, apiUsage: usage };
    } catch (err) {
      if (isLlmQuotaError(err)) {
        console.warn("[AltEra] Groq quota exceeded — using demo museum timeline");
        await applyDemo();
        await runEnrich();
        const usage = tracker.toUsage();
        if (usage.total > 0) {
          await ctx.runMutation(internal.simulationsInternal.patchApiUsage, {
            simulationId: args.simulationId,
            apiUsage: usage,
          });
        }
        return { ok: true, apiUsage: usage.total > 0 ? usage : undefined };
      }
      throw err;
    }
  },
});
