"use node";

import { internalAction, type ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { type Infer, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { apiUsage } from "../validators";

const visionOut = v.object({
  artifactName: v.string(),
  artifactType: v.string(),
  labelText: v.string(),
  estimatedEra: v.string(),
  historicalContext: v.string(),
  confidence: v.number(),
});

const durationOption = v.object({
  id: v.string(),
  label: v.string(),
  spanYears: v.number(),
  description: v.string(),
});

const e2eResult = v.object({
  scanId: v.id("museumScans"),
  simulationId: v.id("simulations"),
  vision: visionOut,
  durations: v.array(durationOption),
  timeline: v.object({
    ok: v.boolean(),
    apiUsage: v.optional(apiUsage),
  }),
  summary: v.union(
    v.object({
      chaosScore: v.optional(v.number()),
      eventCount: v.number(),
      events: v.array(
        v.object({
          year: v.string(),
          title: v.string(),
          description: v.string(),
        }),
      ),
      lostToHistory: v.optional(v.array(v.string())),
      gainedByHumanity: v.optional(v.array(v.string())),
      relicPrompt: v.optional(v.string()),
      apiUsage: v.optional(apiUsage),
    }),
    v.null(),
  ),
});

async function runMuseumPipeline(
  ctx: ActionCtx,
  images: { artifactImageId: Id<"_storage">; labelImageId: Id<"_storage"> },
): Promise<Infer<typeof e2eResult>> {
  const userId = await ctx.runQuery(internal.test.museumE2EInternal.getFirstUserId, {});
  if (!userId) {
    throw new Error(
      "No user in database. Sign in via the app once, then re-run this test.",
    );
  }

  const scanId = await ctx.runMutation(internal.test.museumE2EInternal.createTestScan, {
    userId,
    artifactImageId: images.artifactImageId,
    labelImageId: images.labelImageId,
  });

  console.log("[museumE2E] Running analyzeMuseumPhotos (Groq vision)…");
  const vision = await ctx.runAction(api.actions.analyzeMuseumPhotos.run, {
    scanId,
    demo: false,
  });

  await ctx.runMutation(internal.test.museumE2EInternal.confirmTestScan, {
    scanId,
    extractedArtifactName: vision.artifactName,
    extractedLabelText: vision.labelText,
    extractedEra: vision.estimatedEra,
    historicalContext: vision.historicalContext,
  });

  console.log("[museumE2E] Running suggestTimeDurations (Groq text)…");
  const durationResult = await ctx.runAction(api.actions.suggestTimeDurations.run, {
    scanId,
    demo: false,
  });
  const pick = durationResult.options[0];
  if (!pick) throw new Error("No duration options returned");

  const simulationId = await ctx.runMutation(
    internal.test.museumE2EInternal.createTestSimulation,
    { userId, museumScanId: scanId },
  );

  await ctx.runMutation(internal.test.museumE2EInternal.setTestDuration, {
    simulationId,
    selectedDurationId: pick.id,
    selectedDurationLabel: pick.label,
  });

  console.log("[museumE2E] Running generateTimelineFromDuration (Groq + Serper)…");
  const timeline = await ctx.runAction(api.actions.generateTimelineFromDuration.run, {
    simulationId,
    durationId: pick.id,
    demo: false,
  });

  const summary = await ctx.runQuery(internal.test.museumE2EInternal.getSimulationSummary, {
    simulationId,
  });

  console.log("[museumE2E] Done.", {
    simulationId,
    eventCount: summary?.eventCount,
    apiUsage: summary?.apiUsage ?? timeline.apiUsage,
  });

  return {
    scanId,
    simulationId,
    vision,
    durations: durationResult.options,
    timeline,
    summary,
  };
}

export const runFromImageUrl = internalAction({
  args: {
    artifactUrl: v.string(),
    labelUrl: v.optional(v.string()),
  },
  returns: e2eResult,
  handler: async (ctx, args) => {
    const [artifactRes, labelRes] = await Promise.all([
      fetch(args.artifactUrl),
      fetch(args.labelUrl ?? args.artifactUrl),
    ]);
    if (!artifactRes.ok) throw new Error(`Failed to fetch artifact: ${artifactRes.status}`);
    if (!labelRes.ok) throw new Error(`Failed to fetch label: ${labelRes.status}`);

    const artifactImageId = await ctx.storage.store(await artifactRes.blob());
    const labelImageId = await ctx.storage.store(await labelRes.blob());

    return runMuseumPipeline(ctx, { artifactImageId, labelImageId });
  },
});

export const runFromBase64 = internalAction({
  args: {
    artifactBase64: v.string(),
    labelBase64: v.optional(v.string()),
  },
  returns: e2eResult,
  handler: async (ctx, args) => {
    const decodeBase64 = (b64: string): Uint8Array => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    };

    const artifactImageId = await ctx.storage.store(
      new Blob([decodeBase64(args.artifactBase64)], { type: "image/png" }),
    );
    const labelImageId = await ctx.storage.store(
      new Blob([decodeBase64(args.labelBase64 ?? args.artifactBase64)], {
        type: "image/png",
      }),
    );

    return runMuseumPipeline(ctx, { artifactImageId, labelImageId });
  },
});
