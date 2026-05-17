import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/** Remove the deprecated Abandonment of Polonnaruwa incident from an existing deployment. */
export const removeAbandonmentOfPolonnaruwa = mutation({
  args: {},
  returns: v.object({ removed: v.number(), timelineEndYearUpdated: v.boolean() }),
  handler: async (ctx) => {
    let removed = 0;
    for (const inc of await ctx.db.query("timelineIncidents").collect()) {
      if (inc.title === "Abandonment of Polonnaruwa") {
        await ctx.db.delete(inc._id);
        removed += 1;
      }
    }
    let timelineEndYearUpdated = false;
    for (const t of await ctx.db.query("predefinedTimelines").collect()) {
      if (t.slug === "polonnaruwa" && t.endYear === 1232) {
        await ctx.db.patch(t._id, { endYear: 1215 });
        timelineEndYearUpdated = true;
      }
    }
    return { removed, timelineEndYearUpdated };
  },
});

/** Run once after deploy to populate timelines. Safe if data exists. */
export const run = mutation({
  args: { force: v.optional(v.boolean()) },
  returns: v.object({
    timelineIds: v.array(v.id("predefinedTimelines")),
    publishedSimulationIds: v.array(v.id("simulations")),
    skipped: v.boolean(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    timelineIds: import("./_generated/dataModel").Id<"predefinedTimelines">[];
    publishedSimulationIds: import("./_generated/dataModel").Id<"simulations">[];
    skipped: boolean;
  }> => {
    return await ctx.runMutation(internal.seed.run.seedAll, {
      force: args.force,
    });
  },
});
