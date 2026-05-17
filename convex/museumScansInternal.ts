import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getScanUrls = internalQuery({
  args: { scanId: v.id("museumScans") },
  returns: v.union(
    v.object({
      artifactUrl: v.string(),
      labelUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return null;
    const artifactUrl = await ctx.storage.getUrl(scan.artifactImageId);
    if (!artifactUrl) return null;
    const labelUrlRaw = scan.labelImageId
      ? await ctx.storage.getUrl(scan.labelImageId)
      : undefined;
    const labelUrl = labelUrlRaw ?? undefined;
    return labelUrl !== undefined ? { artifactUrl, labelUrl } : { artifactUrl };
  },
});

export const getScanAnalysis = internalQuery({
  args: { scanId: v.id("museumScans") },
  returns: v.union(
    v.object({
      extractedArtifactName: v.string(),
      extractedLabelText: v.string(),
      extractedEra: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan?.extractedArtifactName) return null;
    return {
      extractedArtifactName: scan.extractedArtifactName,
      extractedLabelText: scan.extractedLabelText ?? "",
      extractedEra: scan.extractedEra,
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
