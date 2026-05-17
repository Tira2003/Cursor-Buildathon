import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getIncidentForImageFetch = internalQuery({
  args: { incidentId: v.id("timelineIncidents") },
  returns: v.union(
    v.object({
      incidentId: v.id("timelineIncidents"),
      timelineSlug: v.string(),
      year: v.string(),
      title: v.string(),
      location: v.optional(v.string()),
      order: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const inc = await ctx.db.get(args.incidentId);
    if (!inc) return null;
    const timeline = await ctx.db.get(inc.timelineId);
    if (!timeline) return null;
    return {
      incidentId: inc._id,
      timelineSlug: timeline.slug,
      year: inc.year,
      title: inc.title,
      location: inc.location,
      order: inc.order,
    };
  },
});

export const listIncidentsForImageFetch = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      incidentId: v.id("timelineIncidents"),
      timelineSlug: v.string(),
      year: v.string(),
      title: v.string(),
      location: v.optional(v.string()),
      order: v.number(),
      relatedImageStorageId: v.optional(v.id("_storage")),
    }),
  ),
  handler: async (ctx) => {
    const timelines = await ctx.db.query("predefinedTimelines").collect();
    const slugByTimelineId = new Map(
      timelines.map((t) => [t._id, t.slug] as const),
    );

    const incidents = await ctx.db.query("timelineIncidents").collect();
    return incidents
      .map((inc) => {
        const timelineSlug = slugByTimelineId.get(inc.timelineId);
        if (!timelineSlug) return null;
        return {
          incidentId: inc._id,
          timelineSlug,
          year: inc.year,
          title: inc.title,
          location: inc.location,
          order: inc.order,
          relatedImageStorageId: inc.relatedImageStorageId,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => {
        if (a.timelineSlug !== b.timelineSlug) {
          return a.timelineSlug.localeCompare(b.timelineSlug);
        }
        return a.order - b.order;
      });
  },
});

export const getCacheByKey = internalQuery({
  args: { cacheKey: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("incidentImageCache"),
      storageId: v.id("_storage"),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("incidentImageCache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
    if (!row) return null;
    return { _id: row._id, storageId: row.storageId };
  },
});

export const insertCache = internalMutation({
  args: {
    cacheKey: v.string(),
    storageId: v.id("_storage"),
    searchQuery: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.id("incidentImageCache"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("incidentImageCache", {
      cacheKey: args.cacheKey,
      storageId: args.storageId,
      searchQuery: args.searchQuery,
      sourceUrl: args.sourceUrl,
      createdAt: Date.now(),
    });
  },
});

export const patchIncidentImage = internalMutation({
  args: {
    incidentId: v.id("timelineIncidents"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.incidentId, {
      relatedImageStorageId: args.storageId,
    });
    return null;
  },
});

export const patchCache = internalMutation({
  args: {
    cacheId: v.id("incidentImageCache"),
    storageId: v.id("_storage"),
    searchQuery: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.cacheId, {
      storageId: args.storageId,
      searchQuery: args.searchQuery,
      sourceUrl: args.sourceUrl,
    });
    return null;
  },
});
