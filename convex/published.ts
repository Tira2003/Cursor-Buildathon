import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserId } from "./lib/auth";
import { CHAOS_CHAOTIC_THRESHOLD } from "./lib/constants";

export const publish = mutation({
  args: {
    simulationId: v.id("simulations"),
    title: v.string(),
    description: v.string(),
  },
  returns: v.id("publishedTimelines"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sim = await ctx.db.get(args.simulationId);
    if (!sim || sim.userId !== userId) throw new Error("Not found");
    if (sim.chaosScore === undefined) throw new Error("Simulation not ready to publish");

    const title = args.title.trim();
    const description = args.description.trim();
    if (!title) throw new Error("Title is required");
    if (!description) throw new Error("Description is required");

    const now = Date.now();
    const isChaotic = sim.chaosScore >= CHAOS_CHAOTIC_THRESHOLD;

    await ctx.db.patch(args.simulationId, {
      visibility: "public",
      status: "published",
      isChaotic,
      updatedAt: now,
    });

    const existing = await ctx.db
      .query("publishedTimelines")
      .withIndex("by_simulation", (q) => q.eq("simulationId", args.simulationId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title,
        description,
        chaosScore: sim.chaosScore,
      });
      return existing._id;
    }

    const publishedId = await ctx.db.insert("publishedTimelines", {
      simulationId: args.simulationId,
      authorId: userId,
      title,
      description,
      chaosScore: sim.chaosScore,
      createdAt: now,
    });

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (stats && isChaotic) {
      await ctx.db.patch(stats._id, {
        chaosPublished: stats.chaosPublished + 1,
      });
    }

    return publishedId;
  },
});

export const getForSimulation = query({
  args: { simulationId: v.id("simulations") },
  returns: v.union(
    v.object({
      _id: v.id("publishedTimelines"),
      title: v.string(),
      description: v.string(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("publishedTimelines")
      .withIndex("by_simulation", (q) => q.eq("simulationId", args.simulationId))
      .unique();
    if (!existing) return null;
    return {
      _id: existing._id,
      title: existing.title,
      description: existing.description,
      createdAt: existing.createdAt,
    };
  },
});

export const listPublic = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("publishedTimelines"),
      simulationId: v.id("simulations"),
      title: v.string(),
      description: v.string(),
      chaosScore: v.number(),
      createdAt: v.number(),
      authorName: v.optional(v.string()),
      isChaotic: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    const published = await ctx.db
      .query("publishedTimelines")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const results = [];
    for (const p of published) {
      const sim = await ctx.db.get(p.simulationId);
      const author = await ctx.db.get(p.authorId);
      results.push({
        _id: p._id,
        simulationId: p.simulationId,
        title: p.title,
        description: p.description,
        chaosScore: p.chaosScore,
        createdAt: p.createdAt,
        authorName: author?.name ?? author?.email ?? "Historian",
        isChaotic: sim?.isChaotic ?? p.chaosScore >= CHAOS_CHAOTIC_THRESHOLD,
      });
    }
    return results;
  },
});
