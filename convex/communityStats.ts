import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  returns: v.object({
    timelineCount: v.number(),
    contributorCount: v.number(),
    simulationCount: v.number(),
  }),
  handler: async (ctx) => {
    const [published, publicSimulations, allSimulations] = await Promise.all([
      ctx.db.query("publishedTimelines").collect(),
      ctx.db
        .query("simulations")
        .withIndex("by_visibility_created", (q) => q.eq("visibility", "public"))
        .collect(),
      ctx.db.query("simulations").collect(),
    ]);

    const contributorIds = new Set<string>();
    for (const pub of published) {
      contributorIds.add(pub.authorId);
    }
    for (const sim of publicSimulations) {
      contributorIds.add(sim.userId);
    }

    return {
      timelineCount: published.length,
      contributorCount: contributorIds.size,
      simulationCount: allSimulations.length,
    };
  },
});
