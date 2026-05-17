"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJson } from "../lib/gemini";
import { isLlmRateLimitError } from "../lib/llmErrors";
import { normalizeTimelineEvents } from "../lib/normalizeTimeline";
import type { TimelineEvent } from "../types/contracts";

export const run = action({
  args: {
    simulationId: v.id("simulations"),
    durationId: v.string(),
    durationDescription: v.optional(v.string()),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    if (isDemoMode(args.demo)) {
      const t = demoMuseum.timeline;
      await ctx.runMutation(internal.simulationsInternal.patchMuseumTimeline, {
        simulationId: args.simulationId,
        chaosScore: t.chaosScore,
        events: t.events as TimelineEvent[],
        lostToHistory: t.lostToHistory,
        gainedByHumanity: t.gainedByHumanity,
        relicPrompt: t.relicPrompt,
        whatIfPrompt: demoMuseum.vision.historicalContext,
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
        whatIfPrompt: demoMuseum.vision.historicalContext,
      });
    };

    const sim = await ctx.runQuery(internal.simulationsInternal.getMuseumTimelineContext, {
      simulationId: args.simulationId,
    });
    if (!sim) {
      throw new Error("Simulation not found or missing museum scan context");
    }

    const durationLabel = sim.selectedDurationLabel ?? args.durationId;
    const durationDescription =
      args.durationDescription ??
      demoMuseum.durations.options.find((o) => o.id === args.durationId)?.description ??
      "";

    try {
      const data = await generateJson<{
        chaosScore: number;
        events: typeof demoMuseum.timeline.events;
        lostToHistory: string[];
        gainedByHumanity: string[];
        relicPrompt: string;
      }>(
        `Generate alternate timeline JSON: { chaosScore (0-100), events: [{ year, title, description, impactLevel: "low"|"medium"|"high" }], lostToHistory: string[], gainedByHumanity: string[], relicPrompt: string }. impactLevel must be the string "low", "medium", or "high" only — never a number.`,
        [
          `Artifact: ${sim.artifactName}`,
          `Era: ${sim.artifactEra ?? "unknown"}`,
          `Context: ${sim.artifactContext}`,
          sim.parentTimelineSummary
            ? `Prior alternate timeline: ${sim.parentTimelineSummary}`
            : null,
          sim.whatIfPrompt ? `What if: ${sim.whatIfPrompt}` : null,
          `Simulate forward ${durationLabel}: ${durationDescription}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );

      const rawImpactLevels = data.events.map((e) => e.impactLevel);
      const events = normalizeTimelineEvents(data.events);
      // #region agent log
      const coerced = rawImpactLevels.filter(
        (raw, i) => raw !== events[i]?.impactLevel,
      ).length;
      if (coerced > 0) {
        console.log(
          JSON.stringify({
            sessionId: "d3a7e1",
            hypothesisId: "H1",
            location: "generateTimelineFromDuration.ts",
            message: "impactLevel_coerced",
            data: { coerced, sampleRaw: rawImpactLevels.slice(0, 3) },
          }),
        );
      }
      // #endregion

      const whatIfPrompt =
        sim.whatIfPrompt ??
        `What if history unfolded across ${durationLabel} starting from the ${sim.artifactName}?`;

      await ctx.runMutation(internal.simulationsInternal.patchMuseumTimeline, {
        simulationId: args.simulationId,
        chaosScore: Math.min(100, Math.max(0, data.chaosScore)),
        events,
        lostToHistory: data.lostToHistory,
        gainedByHumanity: data.gainedByHumanity,
        relicPrompt: data.relicPrompt,
        whatIfPrompt,
      });
      return { ok: true };
    } catch (err) {
      if (isLlmRateLimitError(err)) {
        if (isDemoMode(args.demo)) {
          console.warn("[AltEra] Groq rate limit — using demo museum timeline");
          await applyDemo();
          return { ok: true };
        }
        throw new Error(
          "Groq API rate limit (429 / rate_limit_exceeded). Check GROQ_API_KEY quota or use ?demo=1 for offline demo.",
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Museum timeline generation failed: ${msg}`);
    }
  },
});
