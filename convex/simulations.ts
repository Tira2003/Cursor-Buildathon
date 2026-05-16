import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib/auth";
import { mapSimulationDoc } from "./lib/mapSimulation";
import { resolveSimulationEventFields } from "./lib/resolveEventImages";
import {
  apiUsage,
  branchChoice,
  simulationSource,
  timelineEvent,
  timelineEventOut,
} from "./validators";

const simulationDoc = v.object({
  _id: v.id("simulations"),
  userId: v.id("users"),
  source: simulationSource,
  originalTimelineId: v.optional(v.id("predefinedTimelines")),
  changedIncidentId: v.optional(v.id("timelineIncidents")),
  whatIfPrompt: v.optional(v.string()),
  museumScanId: v.optional(v.id("museumScans")),
  selectedDurationId: v.optional(v.string()),
  selectedDurationLabel: v.optional(v.string()),
  events: v.array(timelineEventOut),
  immediateRipple: v.optional(v.array(timelineEventOut)),
  generationalShift: v.optional(v.array(timelineEventOut)),
  globalConsequence: v.optional(v.array(timelineEventOut)),
  chaosScore: v.optional(v.number()),
  lostToHistory: v.optional(v.array(v.string())),
  gainedByHumanity: v.optional(v.array(v.string())),
  branchChoices: v.optional(v.array(branchChoice)),
  selectedBranchId: v.optional(v.string()),
  relicPrompt: v.optional(v.string()),
  relicImageId: v.optional(v.id("_storage")),
  relicImageUrl: v.optional(v.string()),
  apiUsage: v.optional(apiUsage),
  isChaotic: v.optional(v.boolean()),
  status: v.string(),
  visibility: v.string(),
  remixOfSimulationId: v.optional(v.id("simulations")),
  stabilizedFromSimulationId: v.optional(v.id("simulations")),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const createDraft = mutation({
  args: {
    source: simulationSource,
    originalTimelineId: v.optional(v.id("predefinedTimelines")),
    changedIncidentId: v.optional(v.id("timelineIncidents")),
    whatIfPrompt: v.optional(v.string()),
    museumScanId: v.optional(v.id("museumScans")),
    remixOfSimulationId: v.optional(v.id("simulations")),
    stabilizedFromSimulationId: v.optional(v.id("simulations")),
  },
  returns: v.id("simulations"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const now = Date.now();

    const id = await ctx.db.insert("simulations", {
      userId,
      source: args.source,
      originalTimelineId: args.originalTimelineId,
      changedIncidentId: args.changedIncidentId,
      whatIfPrompt: args.whatIfPrompt,
      museumScanId: args.museumScanId,
      events: [],
      status: "draft",
      visibility: "private",
      remixOfSimulationId: args.remixOfSimulationId,
      stabilizedFromSimulationId: args.stabilizedFromSimulationId,
      createdAt: now,
      updatedAt: now,
    });

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (stats) {
      await ctx.db.patch(stats._id, {
        totalSimulations: stats.totalSimulations + 1,
      });
    } else {
      await ctx.db.insert("playerStats", {
        userId,
        stabilizeWins: 0,
        chaosPublished: 0,
        totalSimulations: 1,
      });
    }

    return id;
  },
});

export const get = query({
  args: { simulationId: v.id("simulations") },
  returns: v.union(simulationDoc, v.null()),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;

    const userId = await getAuthUserId(ctx);
    if (sim.visibility === "private" && sim.userId !== userId) {
      return null;
    }

    const relicImageUrl = sim.relicImageId
      ? await ctx.storage.getUrl(sim.relicImageId)
      : undefined;
    const resolved = await resolveSimulationEventFields(ctx, sim);
    return {
      ...mapSimulationDoc(sim, relicImageUrl ?? undefined),
      ...resolved,
    };
  },
});

export const getPublic = query({
  args: { simulationId: v.id("simulations") },
  returns: v.union(simulationDoc, v.null()),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.visibility !== "public") return null;
    const resolved = await resolveSimulationEventFields(ctx, sim);
    return {
      ...mapSimulationDoc(sim),
      ...resolved,
    };
  },
});

export const listMine = query({
  args: {},
  returns: v.array(simulationDoc),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sims = await ctx.db
      .query("simulations")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const results = [];
    for (const s of sims) {
      const resolved = await resolveSimulationEventFields(ctx, s);
      results.push({
        ...mapSimulationDoc(s),
        ...resolved,
      });
    }
    return results;
  },
});

export const selectBranch = mutation({
  args: {
    simulationId: v.id("simulations"),
    selectedBranchId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.simulationId, {
      selectedBranchId: args.selectedBranchId,
      status: "phase2",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setWhatIf = mutation({
  args: {
    simulationId: v.id("simulations"),
    whatIfPrompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    const trimmed = args.whatIfPrompt.trim();
    if (trimmed.length < 5) {
      throw new Error("What-if prompt must be at least 5 characters.");
    }

    await ctx.db.patch(args.simulationId, {
      whatIfPrompt: trimmed,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateEvents = mutation({
  args: {
    simulationId: v.id("simulations"),
    events: v.array(timelineEvent),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.simulationId, {
      events: args.events,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const save = mutation({
  args: { simulationId: v.id("simulations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.simulationId, {
      status: "saved",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setGenerating = mutation({
  args: { simulationId: v.id("simulations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.simulationId, {
      status: "generating",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const setMuseumDuration = mutation({
  args: {
    simulationId: v.id("simulations"),
    selectedDurationId: v.string(),
    selectedDurationLabel: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");

    let whatIfPrompt = `Alternate history over ${args.selectedDurationLabel}`;
    if (sim.museumScanId) {
      const scan = await ctx.db.get(sim.museumScanId);
      if (scan?.extractedArtifactName) {
        whatIfPrompt = `What if history unfolded differently from “${scan.extractedArtifactName}” over ${args.selectedDurationLabel}?`;
      }
    }

    await ctx.db.patch(args.simulationId, {
      selectedDurationId: args.selectedDurationId,
      selectedDurationLabel: args.selectedDurationLabel,
      whatIfPrompt,
      status: "generating",
      updatedAt: Date.now(),
    });
    return null;
  },
});
