"use node";

import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { demoMuseum, isDemoMode } from "../lib/demo";
import { generateJsonWithImages } from "../lib/gemini";
import { isLlmRateLimitError } from "../lib/llmErrors";

const visionResult = v.object({
  artifactName: v.string(),
  artifactType: v.string(),
  labelText: v.string(),
  estimatedEra: v.string(),
  historicalContext: v.string(),
  confidence: v.number(),
});

export const run = action({
  args: {
    scanId: v.id("museumScans"),
    demo: v.optional(v.boolean()),
  },
  returns: visionResult,
  handler: async (ctx, args): Promise<{
    artifactName: string;
    artifactType: string;
    labelText: string;
    estimatedEra: string;
    historicalContext: string;
    confidence: number;
  }> => {
    if (isDemoMode(args.demo)) {
      const data = demoMuseum.vision;
      await ctx.runMutation(internal.museumScansInternal.patchAnalyzed, {
        scanId: args.scanId,
        extractedArtifactName: data.artifactName,
        extractedLabelText: data.labelText,
        extractedEra: data.estimatedEra,
        historicalContext: data.historicalContext,
      });
      return {
        artifactName: data.artifactName,
        artifactType: data.artifactType,
        labelText: data.labelText,
        estimatedEra: data.estimatedEra,
        historicalContext: data.historicalContext,
        confidence: data.confidence,
      };
    }

    const scan = await ctx.runQuery(internal.museumScansInternal.getScanUrls, {
      scanId: args.scanId,
    });
    if (!scan) throw new Error("Scan not found");

    const applyDemo = async () => {
      const data = demoMuseum.vision;
      await ctx.runMutation(internal.museumScansInternal.patchAnalyzed, {
        scanId: args.scanId,
        extractedArtifactName: data.artifactName,
        extractedLabelText: data.labelText,
        extractedEra: data.estimatedEra,
        historicalContext: data.historicalContext,
      });
      return {
        artifactName: data.artifactName,
        artifactType: data.artifactType,
        labelText: data.labelText,
        estimatedEra: data.estimatedEra,
        historicalContext: data.historicalContext,
        confidence: data.confidence,
      };
    };

    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const artifactImageUrl = scan.artifactUrl.startsWith("http")
      ? scan.artifactUrl
      : `${siteUrl}${scan.artifactUrl}`;

    const imageParts: { text?: string; imageUrl?: string }[] = scan.labelUrl
      ? [
          { text: "Artifact photo:" },
          { imageUrl: artifactImageUrl },
          { text: "Museum label photo:" },
          {
            imageUrl: scan.labelUrl.startsWith("http")
              ? scan.labelUrl
              : `${siteUrl}${scan.labelUrl}`,
          },
        ]
      : [
          { text: "Artifact photo (no separate label image provided):" },
          { imageUrl: artifactImageUrl },
        ];

    const prompt = scan.labelUrl
      ? `Analyze museum artifact and label photos. Return JSON: { artifactName, artifactType, labelText, estimatedEra, historicalContext, confidence 0-1 }`
      : `No separate label photo was provided. Analyze the artifact image only and infer name, type, era, any visible inscription, and historical context from the artifact itself. Return JSON: { artifactName, artifactType, labelText, estimatedEra, historicalContext, confidence 0-1 }`;

    try {
      const data = await generateJsonWithImages<{
        artifactName: string;
        artifactType: string;
        labelText: string;
        estimatedEra: string;
        historicalContext: string;
        confidence: number;
      }>(prompt, imageParts);

      await ctx.runMutation(internal.museumScansInternal.patchAnalyzed, {
        scanId: args.scanId,
        extractedArtifactName: data.artifactName,
        extractedLabelText: data.labelText,
        extractedEra: data.estimatedEra,
        historicalContext: data.historicalContext,
      });

      return data;
    } catch (err) {
      if (isLlmRateLimitError(err)) {
        if (isDemoMode(args.demo)) {
          console.warn("[AltEra] Groq rate limit — using demo museum vision");
          return await applyDemo();
        }
        throw new Error(
          "Groq API rate limit (429 / rate_limit_exceeded). Check GROQ_API_KEY quota in the Convex dashboard, or add ?demo=1 for offline demo.",
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Museum vision analysis failed: ${msg}`);
    }
  },
});
