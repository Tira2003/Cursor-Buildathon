import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getSimulationEventForImageFetch = internalQuery({
  args: {
    simulationId: v.id("simulations"),
    eventIndex: v.number(),
  },
  returns: v.union(
    v.object({
      simulationId: v.id("simulations"),
      eventIndex: v.number(),
      year: v.string(),
      title: v.string(),
      artifactName: v.optional(v.string()),
      era: v.optional(v.string()),
      hasImage: v.boolean(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) return null;
    const event = sim.events[args.eventIndex];
    if (!event) return null;

    let artifactName: string | undefined;
    let era: string | undefined;
    if (sim.museumScanId) {
      const scan = await ctx.db.get(sim.museumScanId);
      artifactName = scan?.extractedArtifactName;
      era = scan?.extractedEra;
    }

    return {
      simulationId: sim._id,
      eventIndex: args.eventIndex,
      year: event.year,
      title: event.title,
      artifactName,
      era,
      hasImage: Boolean(event.imageStorageId),
    };
  },
});

export const patchSimulationEventImage = internalMutation({
  args: {
    simulationId: v.id("simulations"),
    eventIndex: v.number(),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.simulationId);
    if (!sim) throw new Error("Simulation not found");
    if (args.eventIndex < 0 || args.eventIndex >= sim.events.length) {
      throw new Error("Invalid event index");
    }

    const events = [...sim.events];
    events[args.eventIndex] = {
      ...events[args.eventIndex],
      imageStorageId: args.storageId,
    };

    await ctx.db.patch(args.simulationId, {
      events,
      updatedAt: Date.now(),
    });
    return null;
  },
});
