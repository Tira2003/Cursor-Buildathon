"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { TimelineEvent } from "../types/contracts";
import type { ApiCallTracker } from "./apiUsage";
import { normalizeEventKey } from "./eventImageKey";
import { acquireApiSlot } from "./rateLimit";
import {
  buildImageSearchQuery,
  downloadImageToStorage,
  pickBestImageResult,
  searchImages,
} from "./serper";

const SERPER_CONCURRENCY = 3;

export type EnrichContext = {
  incidentId?: Id<"timelineIncidents">;
  museumScanId?: Id<"museumScans">;
  parentImageMap: Map<string, Id<"_storage">>;
  incidentCacheImageMap: Map<string, Id<"_storage">>;
  museumCacheImageMap: Map<string, Id<"_storage">>;
};

export type LoadEnrichContextArgs = {
  incidentId?: Id<"timelineIncidents">;
  museumScanId?: Id<"museumScans">;
  parentSimulationId?: Id<"simulations">;
};

export async function loadEnrichContext(
  ctx: ActionCtx,
  args: LoadEnrichContextArgs = {},
): Promise<EnrichContext> {
  const parentImageMap = new Map<string, Id<"_storage">>();
  const incidentCacheImageMap = new Map<string, Id<"_storage">>();
  const museumCacheImageMap = new Map<string, Id<"_storage">>();

  if (args.parentSimulationId) {
    const parentRows = await ctx.runQuery(
      internal.eventImageCacheInternal.getParentEventImageMap,
      { parentSimulationId: args.parentSimulationId },
    );
    for (const row of parentRows) {
      parentImageMap.set(row.eventKey, row.imageStorageId);
    }
  }

  if (args.incidentId) {
    const cacheRows = await ctx.runQuery(
      internal.eventImageCacheInternal.getImagesForIncident,
      { incidentId: args.incidentId },
    );
    for (const row of cacheRows) {
      incidentCacheImageMap.set(row.eventKey, row.imageStorageId);
    }
  }

  if (args.museumScanId) {
    const museumRows = await ctx.runQuery(
      internal.eventImageCacheInternal.getImagesForMuseumScan,
      { museumScanId: args.museumScanId },
    );
    for (const row of museumRows) {
      museumCacheImageMap.set(row.eventKey, row.imageStorageId);
    }
  }

  return {
    incidentId: args.incidentId,
    museumScanId: args.museumScanId,
    parentImageMap,
    incidentCacheImageMap,
    museumCacheImageMap,
  };
}

function resolveImageId(
  event: TimelineEvent,
  enrichCtx: EnrichContext,
): Id<"_storage"> | undefined {
  if (event.imageStorageId) return event.imageStorageId;
  const key = normalizeEventKey(event.year, event.title);
  return (
    enrichCtx.parentImageMap.get(key) ??
    enrichCtx.incidentCacheImageMap.get(key) ??
    enrichCtx.museumCacheImageMap.get(key)
  );
}

async function fetchAndCacheImage(
  ctx: ActionCtx,
  event: TimelineEvent,
  contextHint: string | undefined,
  enrichCtx: EnrichContext,
  tracker?: ApiCallTracker,
): Promise<{ imageStorageId?: Id<"_storage">; serperUsed: boolean }> {
  await acquireApiSlot(ctx, "serper");

  const query = buildImageSearchQuery(event.year, event.title, contextHint);
  const results = await searchImages(query, { num: 8 });
  tracker?.incrementSerper();

  const picked = pickBestImageResult(results);
  if (!picked) {
    return { serperUsed: true };
  }

  const imageStorageId = await downloadImageToStorage(ctx, picked.imageUrl);
  const eventKey = normalizeEventKey(event.year, event.title);

  if (enrichCtx.incidentId) {
    await ctx.runMutation(internal.eventImageCacheInternal.putCachedImage, {
      incidentId: enrichCtx.incidentId,
      eventKey,
      imageStorageId,
    });
    enrichCtx.incidentCacheImageMap.set(eventKey, imageStorageId);
  }

  if (enrichCtx.museumScanId) {
    await ctx.runMutation(internal.eventImageCacheInternal.putCachedMuseumImage, {
      museumScanId: enrichCtx.museumScanId,
      eventKey,
      imageStorageId,
    });
    enrichCtx.museumCacheImageMap.set(eventKey, imageStorageId);
  }

  return { imageStorageId, serperUsed: true };
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function enrichEventList(
  ctx: ActionCtx,
  events: TimelineEvent[],
  contextHint: string | undefined,
  enrichCtx: EnrichContext,
  tracker?: ApiCallTracker,
): Promise<{
  events: TimelineEvent[];
  enriched: number;
  failed: number;
  serperCalls: number;
  cacheHits: number;
}> {
  type PendingSerper = { index: number; event: TimelineEvent };

  const resolved: TimelineEvent[] = events.map((e) => ({ ...e }));
  const pending: PendingSerper[] = [];
  let cacheHits = 0;
  let enriched = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const existing = resolveImageId(event, enrichCtx);
    if (existing) {
      resolved[i] = { ...event, imageStorageId: existing };
      if (!event.imageStorageId) cacheHits += 1;
      enriched += 1;
      continue;
    }
    pending.push({ index: i, event });
  }

  let serperCalls = 0;
  let failed = 0;

  if (pending.length > 0) {
    const serperResults = await runPool(pending, SERPER_CONCURRENCY, async (item) => {
      try {
        const result = await fetchAndCacheImage(
          ctx,
          item.event,
          contextHint,
          enrichCtx,
          tracker,
        );
        return { index: item.index, ...result, ok: true as const };
      } catch (err) {
        console.warn(
          `[AltEra] Serper enrich failed for "${item.event.title}":`,
          err instanceof Error ? err.message : err,
        );
        return { index: item.index, ok: false as const, serperUsed: false };
      }
    });

    for (const r of serperResults) {
      if (r.ok && r.imageStorageId) {
        resolved[r.index] = {
          ...events[r.index],
          imageStorageId: r.imageStorageId,
        };
        enriched += 1;
        if (r.serperUsed) serperCalls += 1;
      } else {
        if (r.ok && r.serperUsed) serperCalls += 1;
        failed += 1;
      }
    }
  }

  return { events: resolved, enriched, failed, serperCalls, cacheHits };
}

export type EnrichWhich = "phase1" | "phase2" | "museum" | "all";

export async function enrichSimulationImages(
  ctx: ActionCtx,
  sim: {
    immediateRipple?: TimelineEvent[];
    generationalShift?: TimelineEvent[];
    globalConsequence?: TimelineEvent[];
    events: TimelineEvent[];
  },
  which: EnrichWhich,
  contextHint?: string,
  enrichCtx?: EnrichContext,
  tracker?: ApiCallTracker,
): Promise<{
  immediateRipple?: TimelineEvent[];
  generationalShift?: TimelineEvent[];
  globalConsequence?: TimelineEvent[];
  events?: TimelineEvent[];
  totalEnriched: number;
  totalFailed: number;
  serperCalls: number;
  cacheHits: number;
}> {
  const ctxMaps = enrichCtx ?? (await loadEnrichContext(ctx, {}));

  let totalEnriched = 0;
  let totalFailed = 0;
  let serperCalls = 0;
  let cacheHits = 0;

  const patch: {
    immediateRipple?: TimelineEvent[];
    generationalShift?: TimelineEvent[];
    globalConsequence?: TimelineEvent[];
    events?: TimelineEvent[];
  } = {};

  if (which === "phase1" || which === "all") {
    if (sim.immediateRipple?.length) {
      const r = await enrichEventList(
        ctx,
        sim.immediateRipple,
        contextHint,
        ctxMaps,
        tracker,
      );
      patch.immediateRipple = r.events;
      totalEnriched += r.enriched;
      totalFailed += r.failed;
      serperCalls += r.serperCalls;
      cacheHits += r.cacheHits;
    }
    if (sim.generationalShift?.length) {
      const r = await enrichEventList(
        ctx,
        sim.generationalShift,
        contextHint,
        ctxMaps,
        tracker,
      );
      patch.generationalShift = r.events;
      totalEnriched += r.enriched;
      totalFailed += r.failed;
      serperCalls += r.serperCalls;
      cacheHits += r.cacheHits;
    }
  }

  if (which === "phase2" || which === "all") {
    if (sim.globalConsequence?.length) {
      const r = await enrichEventList(
        ctx,
        sim.globalConsequence,
        contextHint,
        ctxMaps,
        tracker,
      );
      patch.globalConsequence = r.events;
      totalEnriched += r.enriched;
      totalFailed += r.failed;
      serperCalls += r.serperCalls;
      cacheHits += r.cacheHits;
    }
  }

  if (which === "museum" || which === "all") {
    if (sim.events.length) {
      const r = await enrichEventList(ctx, sim.events, contextHint, ctxMaps, tracker);
      patch.events = r.events;
      totalEnriched += r.enriched;
      totalFailed += r.failed;
      serperCalls += r.serperCalls;
      cacheHits += r.cacheHits;
    }
  }

  if (cacheHits > 0) {
    console.log(
      `[AltEra] Image enrich: ${cacheHits} reused (parent/cache), ${serperCalls} Serper calls`,
    );
  }

  return { ...patch, totalEnriched, totalFailed, serperCalls, cacheHits };
}
