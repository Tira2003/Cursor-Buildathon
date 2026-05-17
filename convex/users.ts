import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const current = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

export const updateDisplayName = mutation({
  args: { name: v.string() },
  returns: v.null(),
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Display name cannot be empty");
    await ctx.db.patch(userId, { name: trimmed });
    return null;
  },
});

export const ensurePlayerStats = mutation({
  args: {},
  returns: v.id("playerStats"),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("playerStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("playerStats", {
      userId,
      stabilizeWins: 0,
      chaosPublished: 0,
      totalSimulations: 0,
    });
  },
});

export const getPlayerStats = query({
  args: {},
  returns: v.union(
    v.object({
      stabilizeWins: v.number(),
      chaosPublished: v.number(),
      totalSimulations: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const stats = await ctx.db
      .query("playerStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!stats) return null;
    return {
      stabilizeWins: stats.stabilizeWins,
      chaosPublished: stats.chaosPublished,
      totalSimulations: stats.totalSimulations,
    };
  },
});
