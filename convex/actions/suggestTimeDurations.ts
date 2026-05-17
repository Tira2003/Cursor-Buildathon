"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJson } from "../lib/gemini";
import { isLlmRateLimitError } from "../lib/llmErrors";
import { recordGroqUsage } from "../lib/recordApiUsage";

const durationOptionsResult = v.object({
  options: v.array(
    v.object({
      id: v.string(),
      label: v.string(),
      spanYears: v.number(),
      description: v.string(),
    }),
  ),
});

type DurationOptions = {
  options: Array<{
    id: string;
    label: string;
    spanYears: number;
    description: string;
  }>;
};

export const run = action({
  args: {
    scanId: v.id("museumScans"),
    demo: v.optional(v.boolean()),
  },
  returns: durationOptionsResult,
  handler: async (ctx, args): Promise<DurationOptions> => {
    if (isDemoMode(args.demo)) {
      return demoMuseum.durations;
    }

    const analysis = await ctx.runQuery(internal.museumScansInternal.getScanAnalysis, {
      scanId: args.scanId,
    });
    if (!analysis) {
      throw new Error("Scan analysis not ready. Wait for artifact vision to complete.");
    }

    try {
      const userId = await ctx.runQuery(internal.museumScansInternal.getScanOwnerUserId, {
        scanId: args.scanId,
      });
      const result = await generateJson<DurationOptions>(
        `You suggest alternate-history simulation time spans for a museum artifact. Return JSON only: { "options": [ { "id": "dur_1", "label": "25 years", "spanYears": 25, "description": "..." }, ... ] }. Provide exactly 4 options with spanYears between 25 and 300, labels like "25 years", descriptions tied to this specific artifact.`,
        `Artifact: ${analysis.extractedArtifactName}\nEra: ${analysis.extractedEra ?? "unknown"}\nDetails: ${analysis.extractedLabelText}`,
      );

      if (userId) {
        await recordGroqUsage(ctx, {
          userId,
          feature: "museum_durations",
          model: result.model,
          usage: result.usage,
          museumScanId: args.scanId,
        });
      }

      const data = result.data;
      if (!data.options?.length) {
        throw new Error("No duration options returned from model");
      }

      return {
        options: data.options.map((opt, i) => ({
          id: opt.id || `dur_${i + 1}`,
          label: opt.label,
          spanYears: opt.spanYears,
          description: opt.description,
        })),
      };
    } catch (err) {
      if (isLlmRateLimitError(err)) {
        throw new Error(
          "Groq API rate limit (429 / rate_limit_exceeded). Check GROQ_API_KEY quota or add ?demo=1 for offline demo durations.",
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Duration suggestions failed: ${msg}`);
    }
  },
});
