import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { apiUsage } from "../validators";

export const getFirstUserId = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user?._id ?? null;
  },
});

export const createTestScan = internalMutation({
  args: {
    userId: v.id("users"),
    artifactImageId: v.id("_storage"),
    labelImageId: v.id("_storage"),
  },
  returns: v.id("museumScans"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("museumScans", {
      userId: args.userId,
      artifactImageId: args.artifactImageId,
      labelImageId: args.labelImageId,
      status: "uploaded",
      createdAt: Date.now(),
    });
  },
});

export const confirmTestScan = internalMutation({
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
      status: "confirmed",
    });
    return null;
  },
});

export const createTestSimulation = internalMutation({
  args: {
    userId: v.id("users"),
    museumScanId: v.id("museumScans"),
  },
  returns: v.id("simulations"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("simulations", {
      userId: args.userId,
      source: "museum",
      museumScanId: args.museumScanId,
      events: [],
      status: "draft",
      visibility: "private",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setTestDuration = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    selectedDurationId: v.string(),
    selectedDurationLabel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      selectedDurationId: args.selectedDurationId,
      selectedDurationLabel: args.selectedDurationLabel,
      updatedAt: Date.now(),
    });
    return null;
  },
});

const eventSummary = v.object({
  year: v.string(),
  title: v.string(),
  description: v.string(),
});

export const getSimulationSummary = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      chaosScore: v.optional(v.number()),
      eventCount: v.number(),
      events: v.array(eventSummary),
      lostToHistory: v.optional(v.array(v.string())),
      gainedByHumanity: v.optional(v.array(v.string())),
      relicPrompt: v.optional(v.string()),
      apiUsage: v.optional(apiUsage),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;
    return {
      chaosScore: sim.chaosScore,
      eventCount: sim.events.length,
      events: sim.events.map((e) => ({
        year: e.year,
        title: e.title,
        description: e.description,
      })),
      lostToHistory: sim.lostToHistory,
      gainedByHumanity: sim.gainedByHumanity,
      relicPrompt: sim.relicPrompt,
      apiUsage: sim.apiUsage,
    };
  },
});
