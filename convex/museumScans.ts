import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib/auth";

export const create = mutation({
  args: {
    artifactImageId: v.id("_storage"),
    labelImageId: v.optional(v.id("_storage")),
  },
  returns: v.id("museumScans"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("museumScans", {
      userId,
      artifactImageId: args.artifactImageId,
      labelImageId: args.labelImageId ?? args.artifactImageId,
      status: "uploaded",
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { scanId: v.id("museumScans") },
  returns: v.union(
    v.object({
      _id: v.id("museumScans"),
      artifactImageId: v.id("_storage"),
      labelImageId: v.id("_storage"),
      artifactUrl: v.union(v.string(), v.null()),
      labelUrl: v.union(v.string(), v.null()),
      extractedArtifactName: v.optional(v.string()),
      extractedLabelText: v.optional(v.string()),
      extractedEra: v.optional(v.string()),
      historicalContext: v.optional(v.string()),
      status: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) return null;
    const artifactUrl = await ctx.storage.getUrl(scan.artifactImageId);
    const labelUrl = await ctx.storage.getUrl(scan.labelImageId);
    const result = {
      _id: scan._id,
      artifactImageId: scan.artifactImageId,
      labelImageId: scan.labelImageId,
      artifactUrl,
      labelUrl,
      extractedArtifactName: scan.extractedArtifactName,
      extractedLabelText: scan.extractedLabelText,
      extractedEra: scan.extractedEra,
      historicalContext: scan.historicalContext,
      status: scan.status as string,
    };
    return result;
  },
});

/** Scan metadata for a simulation the user owns (e.g. museum remix draft). */
export const getLinkedToSimulation = query({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      _id: v.id("museumScans"),
      artifactUrl: v.union(v.string(), v.null()),
      extractedArtifactName: v.optional(v.string()),
      extractedLabelText: v.optional(v.string()),
      extractedEra: v.optional(v.string()),
      historicalContext: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId || !sim.museumScanId) return null;

    const scan = await ctx.db.get(sim.museumScanId);
    if (!scan) return null;

    const artifactUrl = await ctx.storage.getUrl(scan.artifactImageId);
    return {
      _id: scan._id,
      artifactUrl,
      extractedArtifactName: scan.extractedArtifactName,
      extractedLabelText: scan.extractedLabelText,
      extractedEra: scan.extractedEra,
      historicalContext: scan.historicalContext,
    };
  },
});

export const confirmExtracted = mutation({
  args: {
    scanId: v.id("museumScans"),
    extractedArtifactName: v.string(),
    extractedLabelText: v.string(),
    extractedEra: v.optional(v.string()),
    historicalContext: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.scanId, {
      extractedArtifactName: args.extractedArtifactName,
      extractedLabelText: args.extractedLabelText,
      extractedEra: args.extractedEra,
      historicalContext: args.historicalContext,
      status: "confirmed",
    });
    return null;
  },
});

export const patchAnalyzed = mutation({
  args: {
    scanId: v.id("museumScans"),
    extractedArtifactName: v.string(),
    extractedLabelText: v.string(),
    extractedEra: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.scanId, {
      extractedArtifactName: args.extractedArtifactName,
      extractedLabelText: args.extractedLabelText,
      extractedEra: args.extractedEra,
      status: "analyzed",
    });
    return null;
  },
});
