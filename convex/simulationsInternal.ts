import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import {
  apiUsage,
  branchChoice,
  simulationSource,
  timelineEvent,
} from "./validators";
import { CHAOS_CHAOTIC_THRESHOLD } from "./lib/constants";

export const getForStabilize = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      chaosScore: v.optional(v.number()),
      events: v.array(timelineEvent),
      visibility: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;
    const userId = await getAuthUserId(ctx);
    if (sim.visibility === "private" && sim.userId !== userId) return null;
    return {
      chaosScore: sim.chaosScore,
      events: sim.events,
      visibility: sim.visibility,
    };
  },
});

export const getRelicPrompt = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    return sim?.relicPrompt ?? null;
  },
});

export const getGenerationContext = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      whatIfPrompt: v.string(),
      incidentTitle: v.string(),
      incidentDescription: v.string(),
      incidentYear: v.string(),
      realOutcome: v.string(),
      selectedBranchId: v.optional(v.string()),
      selectedBranchTitle: v.optional(v.string()),
      chaosScore: v.optional(v.number()),
      branchChoices: v.optional(v.array(branchChoice)),
      timelineSlug: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim?.changedIncidentId || !sim.whatIfPrompt) return null;

    const incident = await ctx.db.get(sim.changedIncidentId);
    if (!incident) return null;

    const timeline = await ctx.db.get(incident.timelineId);

    let selectedBranchTitle: string | undefined;
    if (sim.selectedBranchId && sim.branchChoices) {
      selectedBranchTitle = sim.branchChoices.find(
        (b) => b.id === sim.selectedBranchId,
      )?.title;
    }

    return {
      whatIfPrompt: sim.whatIfPrompt,
      incidentTitle: incident.title,
      incidentDescription: incident.description,
      incidentYear: incident.year,
      realOutcome: incident.realOutcome,
      selectedBranchId: sim.selectedBranchId,
      selectedBranchTitle,
      chaosScore: sim.chaosScore,
      branchChoices: sim.branchChoices,
      timelineSlug: timeline?.slug,
    };
  },
});

export const patchPhase1 = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    chaosScore: v.number(),
    immediateRipple: v.array(timelineEvent),
    generationalShift: v.array(timelineEvent),
    branchChoices: v.array(branchChoice),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const events = [...args.immediateRipple, ...args.generationalShift];
    await ctx.db.patch(args.simulationId, {
      chaosScore: args.chaosScore,
      events,
      immediateRipple: args.immediateRipple,
      generationalShift: args.generationalShift,
      branchChoices: args.branchChoices,
      isChaotic: args.chaosScore >= CHAOS_CHAOTIC_THRESHOLD,
      status: "phase1",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const patchPhase2 = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    globalConsequence: v.array(timelineEvent),
    lostToHistory: v.array(v.string()),
    gainedByHumanity: v.array(v.string()),
    relicPrompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) throw new Error("Simulation not found");

    await ctx.db.patch(args.simulationId, {
      events: [...sim.events, ...args.globalConsequence],
      globalConsequence: args.globalConsequence,
      lostToHistory: args.lostToHistory,
      gainedByHumanity: args.gainedByHumanity,
      relicPrompt: args.relicPrompt,
      status: "editable",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getMuseumGenerationContext = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      extractedArtifactName: v.string(),
      extractedLabelText: v.string(),
      extractedEra: v.optional(v.string()),
      historicalContext: v.optional(v.string()),
      selectedDurationId: v.optional(v.string()),
      selectedDurationLabel: v.optional(v.string()),
      scanApiUsage: v.optional(apiUsage),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim?.museumScanId) return null;

    const scan = await ctx.db.get(sim.museumScanId);
    if (!scan) return null;

    return {
      extractedArtifactName: scan.extractedArtifactName ?? "Unknown artifact",
      extractedLabelText: scan.extractedLabelText ?? "",
      extractedEra: scan.extractedEra,
      historicalContext: scan.historicalContext,
      selectedDurationId: sim.selectedDurationId,
      selectedDurationLabel: sim.selectedDurationLabel,
      scanApiUsage: scan.apiUsage,
    };
  },
});

export const patchMuseumTimeline = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    chaosScore: v.number(),
    events: v.array(timelineEvent),
    lostToHistory: v.array(v.string()),
    gainedByHumanity: v.array(v.string()),
    relicPrompt: v.string(),
    apiUsage: v.optional(apiUsage),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      chaosScore: args.chaosScore,
      events: args.events,
      lostToHistory: args.lostToHistory,
      gainedByHumanity: args.gainedByHumanity,
      relicPrompt: args.relicPrompt,
      isChaotic: args.chaosScore >= CHAOS_CHAOTIC_THRESHOLD,
      status: "editable",
      updatedAt: Date.now(),
      ...(args.apiUsage !== undefined ? { apiUsage: args.apiUsage } : {}),
    });
    return null;
  },
});

export const getApiUsage = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(apiUsage, v.null()),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    return sim?.apiUsage ?? null;
  },
});

export const patchApiUsage = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    apiUsage,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      apiUsage: args.apiUsage,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const patchRelicImage = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    relicImageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      relicImageId: args.relicImageId,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getForEnrich = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      events: v.array(timelineEvent),
      immediateRipple: v.optional(v.array(timelineEvent)),
      generationalShift: v.optional(v.array(timelineEvent)),
      globalConsequence: v.optional(v.array(timelineEvent)),
      incidentTitle: v.optional(v.string()),
      changedIncidentId: v.optional(v.id("timelineIncidents")),
      museumScanId: v.optional(v.id("museumScans")),
      remixOfSimulationId: v.optional(v.id("simulations")),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;

    let incidentTitle: string | undefined;
    if (sim.changedIncidentId) {
      const incident = await ctx.db.get(sim.changedIncidentId);
      incidentTitle = incident?.title;
    } else if (sim.museumScanId) {
      const scan = await ctx.db.get(sim.museumScanId);
      incidentTitle = scan?.extractedArtifactName;
    }

    return {
      events: sim.events,
      immediateRipple: sim.immediateRipple,
      generationalShift: sim.generationalShift,
      globalConsequence: sim.globalConsequence,
      incidentTitle,
      changedIncidentId: sim.changedIncidentId,
      museumScanId: sim.museumScanId,
      remixOfSimulationId: sim.remixOfSimulationId,
    };
  },
});

export const getMuseumRemixParentContext = internalQuery({
  args: { remixOfSimulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      artifactName: v.string(),
      selectedDurationLabel: v.optional(v.string()),
      eventTitlesSummary: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.remixOfSimulationId);
    if (!parent?.museumScanId) return null;

    const scan = await ctx.db.get(parent.museumScanId);
    if (!scan) return null;

    const eventTitles = parent.events
      .slice(0, 6)
      .map((e) => `${e.year}: ${e.title}`)
      .join("; ");

    return {
      artifactName: scan.extractedArtifactName ?? "Unknown artifact",
      selectedDurationLabel: parent.selectedDurationLabel,
      eventTitlesSummary: eventTitles || undefined,
    };
  },
});

export const getRemixParentContext = internalQuery({
  args: { remixOfSimulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      whatIfPrompt: v.string(),
      selectedBranchTitle: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.remixOfSimulationId);
    if (!parent?.whatIfPrompt) return null;

    let selectedBranchTitle: string | undefined;
    if (parent.selectedBranchId && parent.branchChoices) {
      selectedBranchTitle = parent.branchChoices.find(
        (b) => b.id === parent.selectedBranchId,
      )?.title;
    }

    return {
      whatIfPrompt: parent.whatIfPrompt,
      selectedBranchTitle,
    };
  },
});

export const patchEventImages = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    immediateRipple: v.optional(v.array(timelineEvent)),
    generationalShift: v.optional(v.array(timelineEvent)),
    globalConsequence: v.optional(v.array(timelineEvent)),
    events: v.optional(v.array(timelineEvent)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) throw new Error("Simulation not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.immediateRipple !== undefined) {
      patch.immediateRipple = args.immediateRipple;
    }
    if (args.generationalShift !== undefined) {
      patch.generationalShift = args.generationalShift;
    }
    if (args.globalConsequence !== undefined) {
      patch.globalConsequence = args.globalConsequence;
    }
    if (args.events !== undefined) {
      patch.events = args.events;
    } else if (
      args.immediateRipple !== undefined ||
      args.generationalShift !== undefined ||
      args.globalConsequence !== undefined
    ) {
      const immediate = args.immediateRipple ?? sim.immediateRipple ?? [];
      const generational = args.generationalShift ?? sim.generationalShift ?? [];
      const global = args.globalConsequence ?? sim.globalConsequence ?? [];
      patch.events = [...immediate, ...generational, ...global];
    }

    await ctx.db.patch(args.simulationId, patch);
    return null;
  },
});

const PROPAGATE_ALLOWED_STATUSES = new Set([
  "editable",
  "saved",
  "published",
]);

export const getPropagateContext = internalQuery({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      source: simulationSource,
      whatIfPrompt: v.optional(v.string()),
      events: v.array(timelineEvent),
      chaosScore: v.optional(v.number()),
      status: v.string(),
      incidentTitle: v.optional(v.string()),
      incidentYear: v.optional(v.string()),
      artifactName: v.optional(v.string()),
      changedIncidentId: v.optional(v.id("timelineIncidents")),
      museumScanId: v.optional(v.id("museumScans")),
      remixOfSimulationId: v.optional(v.id("simulations")),
      hasPhaseArrays: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;

    const userId = await getAuthUserId(ctx);
    if (!userId || sim.userId !== userId) return null;
    if (!PROPAGATE_ALLOWED_STATUSES.has(sim.status)) return null;

    let incidentTitle: string | undefined;
    let incidentYear: string | undefined;
    let artifactName: string | undefined;

    if (sim.changedIncidentId) {
      const incident = await ctx.db.get(sim.changedIncidentId);
      incidentTitle = incident?.title;
      incidentYear = incident?.year;
    }

    if (sim.museumScanId) {
      const scan = await ctx.db.get(sim.museumScanId);
      artifactName = scan?.extractedArtifactName;
    }

    return {
      userId,
      source: sim.source,
      whatIfPrompt: sim.whatIfPrompt,
      events: sim.events,
      chaosScore: sim.chaosScore,
      status: sim.status,
      incidentTitle,
      incidentYear,
      artifactName,
      changedIncidentId: sim.changedIncidentId,
      museumScanId: sim.museumScanId,
      remixOfSimulationId: sim.remixOfSimulationId,
      hasPhaseArrays: Boolean(
        sim.immediateRipple?.length || sim.generationalShift?.length,
      ),
    };
  },
});

export const patchPropagatedTimeline = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    events: v.array(timelineEvent),
    chaosScore: v.optional(v.number()),
    syncPhaseArrays: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      events: args.events,
      updatedAt: Date.now(),
    };

    if (args.chaosScore !== undefined) {
      patch.chaosScore = args.chaosScore;
      patch.isChaotic = args.chaosScore >= CHAOS_CHAOTIC_THRESHOLD;
    }

    if (args.syncPhaseArrays && args.events.length > 0) {
      const half = Math.ceil(args.events.length / 2);
      patch.immediateRipple = args.events.slice(0, half);
      patch.generationalShift = args.events.slice(half);
    }

    await ctx.db.patch(args.simulationId, patch);
    return null;
  },
});

export const patchChaos = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    chaosScore: v.number(),
    events: v.array(timelineEvent),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.simulationId, {
      chaosScore: args.chaosScore,
      events: args.events,
      isChaotic: args.chaosScore >= CHAOS_CHAOTIC_THRESHOLD,
      updatedAt: Date.now(),
    });
    return null;
  },
});
