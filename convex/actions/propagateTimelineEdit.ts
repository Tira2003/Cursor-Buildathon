"use node";

import { action, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker, mergeApiUsage } from "../lib/apiUsage";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJson } from "../lib/groq";
import { isLlmQuotaError } from "../lib/llmErrors";
import { normalizeTimelineEvents } from "../lib/normalizeLlm";
import { resolveEventListWithStorage } from "../lib/resolveEventImages";
import type { TimelineEvent } from "../types/contracts";
import { apiUsage as apiUsageValidator, timelineEvent, timelineEventOut } from "../validators";

const propagateSchema = `Return JSON: {
  "downstreamEvents": [{ "year": string, "title": string, "description": string, "impactLevel": "low"|"medium"|"high" }],
  "chaosScore": number
}. downstreamEvents must have EXACTLY the count specified in the user message.`;

function clampAnchor(anchorIndex: number, length: number): number {
  if (length === 0) return 0;
  return Math.max(0, Math.min(anchorIndex, length - 1));
}

function mergeStorageFromDb(
  draft: TimelineEvent[],
  stored: TimelineEvent[],
): TimelineEvent[] {
  return draft.map((ev, i) => ({
    ...ev,
    imageStorageId: ev.imageStorageId ?? stored[i]?.imageStorageId,
  }));
}

/** Keep existing slide images by position — no Serper on editor ripple. */
function preserveDownstreamImages(
  prefix: TimelineEvent[],
  downstream: TimelineEvent[],
  prior: TimelineEvent[],
): TimelineEvent[] {
  return downstream.map((ev, i) => {
    const prev = prior[prefix.length + i];
    return prev?.imageStorageId
      ? { ...ev, imageStorageId: prev.imageStorageId }
      : ev;
  });
}

type PropagateArgs = {
  simulationId: import("../_generated/dataModel").Id<"simulations">;
  anchorIndex: number;
  events: TimelineEvent[];
  demo?: boolean;
};

type PropagateResult = {
  events: TimelineEvent[];
  chaosScore?: number;
  apiUsage?: {
    groq: number;
    serper: number;
    total: number;
    updatedAt: number;
  };
};

async function propagateHandler(
  ctx: ActionCtx,
  args: PropagateArgs,
): Promise<PropagateResult> {
    const context = await ctx.runQuery(internal.simulationsInternal.getPropagateContext, {
      simulationId: args.simulationId,
    });
    if (!context) {
      throw new Error("Simulation not found or not editable");
    }

    if (args.events.length === 0) {
      throw new Error("No events to propagate");
    }

    const anchorIndex = clampAnchor(args.anchorIndex, args.events.length);
    const downstreamCount = args.events.length - anchorIndex - 1;
    const draftWithStorage = mergeStorageFromDb(
      normalizeTimelineEvents(args.events),
      context.events,
    );

    const tracker = new ApiCallTracker();

    let merged: TimelineEvent[];
    let chaosScore = context.chaosScore;

    if (isDemoMode(args.demo)) {
      const demoEvents = normalizeTimelineEvents(demoMuseum.timeline.events);
      const downstream =
        downstreamCount > 0
          ? demoEvents.slice(0, downstreamCount).map((ev, i) => ({
              ...ev,
              year: draftWithStorage[anchorIndex + 1 + i]?.year ?? ev.year,
            }))
          : [];
      const demoPrefix = draftWithStorage.slice(0, anchorIndex + 1);
      merged = [
        ...demoPrefix,
        ...preserveDownstreamImages(demoPrefix, downstream, draftWithStorage),
      ];
      chaosScore = demoMuseum.timeline.chaosScore;
    } else {
      if (downstreamCount === 0) {
        merged = draftWithStorage;
      } else {
        const contextLabel =
          context.artifactName ??
          context.incidentTitle ??
          "alternate history";
        const fixedPrefix = draftWithStorage
          .slice(0, anchorIndex + 1)
          .map(
            (e) =>
              `${e.year}: ${e.title} — ${e.description}`,
          )
          .join("\n");

        const userPrompt = `Alternate-history simulation (${context.source}).
What-if: ${context.whatIfPrompt ?? "unspecified"}
Context: ${contextLabel}${context.incidentYear ? ` (${context.incidentYear})` : ""}

Events 0 through ${anchorIndex} are FIXED (already happened in this branch):
${fixedPrefix}

Rewrite exactly ${downstreamCount} downstream events (indices ${anchorIndex + 1} through ${args.events.length - 1}) as causal consequences of the edited branch above.
Preserve chronological order. Each event needs year, title, description, impactLevel.`;

        try {
          const data = await generateJson<{
            downstreamEvents: TimelineEvent[];
            chaosScore?: number;
          }>(
            propagateSchema,
            userPrompt,
            tracker,
            ctx,
          );

          let downstream = normalizeTimelineEvents(data.downstreamEvents ?? []);
          if (downstream.length > downstreamCount) {
            downstream = downstream.slice(0, downstreamCount);
          }
          while (downstream.length < downstreamCount) {
            const fallback = draftWithStorage[anchorIndex + 1 + downstream.length];
            if (fallback) {
              downstream.push({ ...fallback });
            } else {
              break;
            }
          }

          const prefix = draftWithStorage.slice(0, anchorIndex + 1);
          merged = [
            ...prefix,
            ...preserveDownstreamImages(prefix, downstream, draftWithStorage),
          ];
          if (typeof data.chaosScore === "number" && !Number.isNaN(data.chaosScore)) {
            chaosScore = Math.round(
              Math.max(0, Math.min(100, data.chaosScore)),
            );
          }
        } catch (err) {
          if (isLlmQuotaError(err)) {
            throw new Error(
              "AI quota exceeded — try again later or use demo mode",
            );
          }
          throw err;
        }
      }
    }

    await ctx.runMutation(internal.simulationsInternal.patchPropagatedTimeline, {
      simulationId: args.simulationId,
      events: merged,
      chaosScore,
      syncPhaseArrays: context.hasPhaseArrays,
    });

    const existing = await ctx.runQuery(internal.simulationsInternal.getApiUsage, {
      simulationId: args.simulationId,
    });
    const usage = mergeApiUsage(existing ?? undefined, tracker.toUsage());
    await ctx.runMutation(internal.simulationsInternal.patchApiUsage, {
      simulationId: args.simulationId,
      apiUsage: usage,
    });

    const resolved = await resolveEventListWithStorage(ctx, merged);

    return {
      events: resolved,
      chaosScore,
      apiUsage: usage,
    };
}

export const run = action({
  args: {
    simulationId: v.id("simulations"),
    anchorIndex: v.number(),
    events: v.array(timelineEvent),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    events: v.array(timelineEventOut),
    chaosScore: v.optional(v.number()),
    apiUsage: v.optional(apiUsageValidator),
  }),
  handler: propagateHandler,
});
