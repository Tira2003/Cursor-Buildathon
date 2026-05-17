import { query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: {},
  returns: v.object({
    timelineCount: v.number(),
    incidentCount: v.number(),
    simulationCount: v.number(),
    memberCount: v.number(),
  }),
  handler: async (ctx) => {
    const [timelines, incidents, simulations, users] = await Promise.all([
      ctx.db.query("predefinedTimelines").collect(),
      ctx.db.query("timelineIncidents").collect(),
      ctx.db.query("simulations").collect(),
      ctx.db.query("users").collect(),
    ]);

    return {
      timelineCount: timelines.length,
      incidentCount: incidents.length,
      simulationCount: simulations.length,
      memberCount: users.length,
    };
  },
});
