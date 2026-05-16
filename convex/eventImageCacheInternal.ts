import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { normalizeEventKey } from "./lib/eventImageKey";
import type { Id } from "./_generated/dataModel";
import type { TimelineEvent } from "./types/contracts";

function collectEventImages(
  events: TimelineEvent[] | undefined,
  into: Map<string, Id<"_storage">>,
): void {
  if (!events) return;
  for (const ev of events) {
    if (!ev.imageStorageId) continue;
    into.set(normalizeEventKey(ev.year, ev.title), ev.imageStorageId);
  }
}

export const getImagesForIncident = internalQuery({
  args: { incidentId: v.id("timelineIncidents") },
  returns: v.array(
    v.object({
      eventKey: v.string(),
      imageStorageId: v.id("_storage"),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("eventImageCache")
      .withIndex("by_incident", (q) => q.eq("incidentId", args.incidentId))
      .collect();
    return rows.map((r) => ({
      eventKey: r.eventKey,
      imageStorageId: r.imageStorageId,
    }));
  },
});

export const getParentEventImageMap = internalQuery({
  args: { parentSimulationId: v.id("simulations") },
  returns: v.array(
    v.object({
      eventKey: v.string(),
      imageStorageId: v.id("_storage"),
    }),
  ),
  handler: async (ctx, args) => {
    const sim = await ctx.db.get(args.parentSimulationId);
    if (!sim) return [];

    const map = new Map<string, Id<"_storage">>();
    collectEventImages(sim.immediateRipple, map);
    collectEventImages(sim.generationalShift, map);
    collectEventImages(sim.globalConsequence, map);
    collectEventImages(sim.events, map);

    return [...map.entries()].map(([eventKey, imageStorageId]) => ({
      eventKey,
      imageStorageId,
    }));
  },
});

export const getImagesForMuseumScan = internalQuery({
  args: { museumScanId: v.id("museumScans") },
  returns: v.array(
    v.object({
      eventKey: v.string(),
      imageStorageId: v.id("_storage"),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("museumEventImageCache")
      .withIndex("by_scan", (q) => q.eq("museumScanId", args.museumScanId))
      .collect();
    return rows.map((r) => ({
      eventKey: r.eventKey,
      imageStorageId: r.imageStorageId,
    }));
  },
});

export const putCachedMuseumImage = internalMutation({
  args: {
    museumScanId: v.id("museumScans"),
    eventKey: v.string(),
    imageStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("museumEventImageCache")
      .withIndex("by_scan_event", (q) =>
        q.eq("museumScanId", args.museumScanId).eq("eventKey", args.eventKey),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        imageStorageId: args.imageStorageId,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("museumEventImageCache", {
        museumScanId: args.museumScanId,
        eventKey: args.eventKey,
        imageStorageId: args.imageStorageId,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

export const putCachedImage = internalMutation({
  args: {
    incidentId: v.id("timelineIncidents"),
    eventKey: v.string(),
    imageStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("eventImageCache")
      .withIndex("by_incident_event", (q) =>
        q.eq("incidentId", args.incidentId).eq("eventKey", args.eventKey),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        imageStorageId: args.imageStorageId,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("eventImageCache", {
        incidentId: args.incidentId,
        eventKey: args.eventKey,
        imageStorageId: args.imageStorageId,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
