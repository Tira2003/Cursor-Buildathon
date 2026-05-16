"use node";

import { action, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { ApiCallTracker, mergeApiUsage } from "../lib/apiUsage";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJson } from "../lib/groq";
import { isLlmQuotaError } from "../lib/llmErrors";

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

async function suggestDurationsHandler(
  ctx: ActionCtx,
  args: { scanId: import("../_generated/dataModel").Id<"museumScans">; demo?: boolean },
): Promise<DurationOptions> {
    if (isDemoMode(args.demo)) {
      return demoMuseum.durations;
    }

    const scan = await ctx.runQuery(internal.museumScansInternal.getScanForContext, {
      scanId: args.scanId,
    });
    if (!scan) throw new Error("Scan not found");

    const tracker = new ApiCallTracker();

    try {
      const data = await generateJson<{
        options: Array<{
          id: string;
          label: string;
          spanYears: number;
          description: string;
        }>;
      }>(
        `Suggest 3–4 alternate-history timeline duration options for a museum artifact. Return JSON: { options: [{ id, label, spanYears, description }] }. ids should be short slugs like "25y", "75y".`,
        `Artifact: ${scan.extractedArtifactName ?? "unknown"}
Label: ${scan.extractedLabelText ?? ""}
Era: ${scan.extractedEra ?? "unknown"}
Context: ${scan.historicalContext ?? ""}`,
        tracker,
        ctx,
      );

      const usage = mergeApiUsage(scan.apiUsage, tracker.toUsage());
      await ctx.runMutation(internal.museumScansInternal.patchApiUsage, {
        scanId: args.scanId,
        apiUsage: usage,
      });

      return { options: data.options };
    } catch (err) {
      if (isLlmQuotaError(err)) {
        console.warn("[AltEra] Groq quota exceeded — using demo museum durations");
        return demoMuseum.durations;
      }
      throw err;
    }
}

export const run = action({
  args: {
    scanId: v.id("museumScans"),
    demo: v.optional(v.boolean()),
  },
  returns: durationOptionsResult,
  handler: suggestDurationsHandler,
});
