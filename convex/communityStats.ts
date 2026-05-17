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
    const [published, simulations] = await Promise.all([
      ctx.db.query("publishedTimelines").collect(),
      ctx.db.query("simulations").collect(),
    ]);

    const contributorIds = new Set<string>();
    for (const sim of simulations) {
      contributorIds.add(sim.userId);
    }
    for (const pub of published) {
      contributorIds.add(pub.authorId);
    }

    return {
      timelineCount: published.length,
      contributorCount: contributorIds.size,
      simulationCount: simulations.length,
    };
  },
});
