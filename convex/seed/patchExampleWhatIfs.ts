import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import exampleWhatIfs from "./exampleWhatIfs.json";

export const run = internalMutation({
  args: {},
  returns: v.object({
    patched: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const incidents = await ctx.db.query("timelineIncidents").collect();
    let patched = 0;
    let skipped = 0;

    for (const inc of incidents) {
      const prompts = exampleWhatIfs[inc.order - 1];
      if (!prompts || prompts.length !== 3) {
        skipped++;
        continue;
      }

      const existing = inc.exampleWhatIfs;
      if (
        existing?.length === 3 &&
        existing.every((p, i) => p === prompts[i])
      ) {
        skipped++;
        continue;
      }

      await ctx.db.patch(inc._id, { exampleWhatIfs: prompts });
      patched++;
    }

    return { patched, skipped };
  },
});
