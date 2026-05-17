"use node";

import { action, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  buildSimulationEventCacheKey,
  buildSimulationEventSearchQuery,
} from "../lib/eventImageKey";
import { resolveImageSearchCountry } from "../lib/imageSearchCountry";
import { recordSerperUsage } from "../lib/recordApiUsage";
import { fetchFirstValidImage, searchImages } from "../lib/serper";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAndStoreEventImage(
  ctx: ActionCtx,
  simulationId: Id<"simulations">,
  eventIndex: number,
  force: boolean,
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  const target = await ctx.runQuery(
    internal.simulationImagesInternal.getSimulationEventForImageFetch,
    { simulationId, eventIndex },
  );
  if (!target) {
    return { ok: false, error: "Simulation event not found" };
  }

  if (!force && target.hasImage) {
    const sim = await ctx.runQuery(internal.simulationsInternal.getSimulationEventImage, {
      simulationId,
      eventIndex,
    });
    if (sim?.imageUrl) {
      return { ok: true, imageUrl: sim.imageUrl };
    }
  }

  const country = resolveImageSearchCountry({
    timelineSlug: target.timelineSlug,
    location: target.location,
    title: target.title,
    historicalContext: target.historicalContext,
  });

  const cacheKey = buildSimulationEventCacheKey(
    simulationId,
    eventIndex,
    target.title,
    country,
  );

  if (!force) {
    const cached = await ctx.runQuery(internal.incidentImagesInternal.getCacheByKey, {
      cacheKey,
    });
    if (cached) {
      await ctx.runMutation(
        internal.simulationImagesInternal.patchSimulationEventImage,
        { simulationId, eventIndex, storageId: cached.storageId },
      );
      const imageUrl = await ctx.storage.getUrl(cached.storageId);
      if (imageUrl) return { ok: true, imageUrl };
    }
  }

  const searchQuery = buildSimulationEventSearchQuery(
    target.title,
    target.year,
    country,
    target.location,
    target.artifactName,
    target.era,
  );

  const { results } = await searchImages(searchQuery, { num: 5 });

  const userId = await ctx.runQuery(
    internal.simulationsInternal.getSimulationOwnerUserId,
    { simulationId },
  );
  if (userId) {
    await recordSerperUsage(ctx, {
      userId,
      feature: "simulation_event_image",
      simulationId,
    });
  }

  const image = await fetchFirstValidImage(results);
  if (!image) {
    return { ok: false, error: "No downloadable image from Serper" };
  }

  const storageId = await ctx.storage.store(image.blob);

  const existing = await ctx.runQuery(internal.incidentImagesInternal.getCacheByKey, {
    cacheKey,
  });
  if (existing) {
    await ctx.runMutation(internal.incidentImagesInternal.patchCache, {
      cacheId: existing._id,
      storageId,
      searchQuery,
      sourceUrl: image.sourceUrl,
    });
  } else {
    await ctx.runMutation(internal.incidentImagesInternal.insertCache, {
      cacheKey,
      storageId,
      searchQuery,
      sourceUrl: image.sourceUrl,
    });
  }

  await ctx.runMutation(internal.simulationImagesInternal.patchSimulationEventImage, {
    simulationId,
    eventIndex,
    storageId,
  });

  const imageUrl = await ctx.storage.getUrl(storageId);
  if (!imageUrl) {
    return { ok: false, error: "Failed to resolve stored image URL" };
  }
  return { ok: true, imageUrl };
}

export const fetchOne = action({
  args: {
    simulationId: v.id("simulations"),
    eventIndex: v.number(),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      const result = await fetchAndStoreEventImage(
        ctx,
        args.simulationId,
        args.eventIndex,
        args.force ?? true,
      );
      if (result.ok) {
        return { ok: true, imageUrl: result.imageUrl };
      }
      return { ok: false, error: result.error };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  },
});

export const fetchForSimulation = action({
  args: {
    simulationId: v.id("simulations"),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    fetched: v.number(),
    skipped: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const meta = await ctx.runQuery(internal.simulationsInternal.getSimulationEventsMeta, {
      simulationId: args.simulationId,
    });
    if (!meta) {
      return { fetched: 0, skipped: 0, failed: 0, errors: ["Simulation not found"] };
    }

    let fetched = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < meta.count; i++) {
      const eventMeta = await ctx.runQuery(
        internal.simulationImagesInternal.getSimulationEventForImageFetch,
        { simulationId: args.simulationId, eventIndex: i },
      );
      if (!eventMeta) continue;

      if (!args.force && eventMeta.hasImage) {
        skipped++;
        continue;
      }

      try {
        const result = await fetchAndStoreEventImage(
          ctx,
          args.simulationId,
          i,
          args.force ?? false,
        );
        if (result.ok) {
          fetched++;
        } else {
          failed++;
          errors.push(`evt-${i}: ${result.error}`);
        }
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`evt-${i}: ${msg}`);
      }
      await delay(400);
    }

    return { fetched, skipped, failed, errors };
  },
});
