import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import incidentsData from "./incidents.json";

type IncidentRow = (typeof incidentsData)[number] & {
  exampleWhatIfs?: string[];
};

/** Patch exampleWhatIfs onto existing seeded incidents (by stable order). */
export const run = internalMutation({
  args: {},
  returns: v.object({
    patched: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const byOrder = new Map(
      (incidentsData as IncidentRow[]).map((row) => [row.order, row.exampleWhatIfs]),
    );

    const incidents = await ctx.db.query("timelineIncidents").collect();
    let patched = 0;
    let skipped = 0;

    for (const inc of incidents) {
      const prompts = byOrder.get(inc.order);
      if (!prompts || prompts.length !== 3) {
        skipped += 1;
        continue;
      }
      await ctx.db.patch(inc._id, { exampleWhatIfs: prompts });
      patched += 1;
    }

    return { patched, skipped };
  },
});
