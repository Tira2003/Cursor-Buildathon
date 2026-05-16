import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { apiUsage } from "./validators";

export const getScanUrls = internalQuery({
  args: { scanId: v.id("museumScans") },
  returns: v.union(
    v.object({
      artifactUrl: v.string(),
      labelUrl: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    const artifactUrl = await ctx.storage.getUrl(scan.artifactImageId);
    const labelUrl = await ctx.storage.getUrl(scan.labelImageId);
    if (!artifactUrl || !labelUrl) return null;
    return { artifactUrl, labelUrl };
  },
});

export const getScanForContext = internalQuery({
  args: { scanId: v.id("museumScans") },
  returns: v.union(
    v.object({
      extractedArtifactName: v.optional(v.string()),
      extractedLabelText: v.optional(v.string()),
      extractedEra: v.optional(v.string()),
      historicalContext: v.optional(v.string()),
      apiUsage: v.optional(apiUsage),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    return {
      extractedArtifactName: scan.extractedArtifactName,
      extractedLabelText: scan.extractedLabelText,
      extractedEra: scan.extractedEra,
      historicalContext: scan.historicalContext,
      apiUsage: scan.apiUsage,
    };
  },
});

export const patchAnalyzed = internalMutation({
  args: {
    scanId: v.id("museumScans"),
    extractedArtifactName: v.string(),
    extractedLabelText: v.string(),
    extractedEra: v.optional(v.string()),
    historicalContext: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, {
      extractedArtifactName: args.extractedArtifactName,
      extractedLabelText: args.extractedLabelText,
      extractedEra: args.extractedEra,
      historicalContext: args.historicalContext,
      status: "analyzed",
    });
    return null;
  },
});

export const patchApiUsage = internalMutation({
  args: {
    scanId: v.id("museumScans"),
    apiUsage,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scanId, { apiUsage: args.apiUsage });
    return null;
  },
});
