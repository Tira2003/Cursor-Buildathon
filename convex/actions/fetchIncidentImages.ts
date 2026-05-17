"use node";

import { action, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  buildIncidentImageCacheKey,
  buildIncidentImageSearchQuery,
} from "../lib/incidentImageKey";
import {
  fetchFirstValidImage,
  searchImages,
} from "../lib/serper";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type IncidentImageTarget = {
  incidentId: Id<"timelineIncidents">;
  timelineSlug: string;
  year: string;
  title: string;
  location?: string;
  order: number;
};

async function fetchAndStoreIncidentImage(
  ctx: ActionCtx,
  inc: IncidentImageTarget,
  force: boolean,
): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
  const cacheKey = buildIncidentImageCacheKey(
    inc.timelineSlug,
    inc.order,
    inc.title,
  );

  if (!force) {
    const cached = await ctx.runQuery(
      internal.incidentImagesInternal.getCacheByKey,
      { cacheKey },
    );
    if (cached) {
      await ctx.runMutation(internal.incidentImagesInternal.patchIncidentImage, {
        incidentId: inc.incidentId,
        storageId: cached.storageId,
      });
      const imageUrl = await ctx.storage.getUrl(cached.storageId);
      if (imageUrl) return { ok: true, imageUrl };
    }
  }

  const searchQuery = buildIncidentImageSearchQuery(
    inc.title,
    inc.location,
    inc.year,
  );

  const results = await searchImages(searchQuery, { num: 5 });
  const image = await fetchFirstValidImage(results);
  if (!image) {
    return { ok: false, error: "No downloadable image found" };
  }

  const storageId = await ctx.storage.store(image.blob);
  const existing = await ctx.runQuery(
    internal.incidentImagesInternal.getCacheByKey,
    { cacheKey },
  );
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
  await ctx.runMutation(internal.incidentImagesInternal.patchIncidentImage, {
    incidentId: inc.incidentId,
    storageId,
  });
  const imageUrl = await ctx.storage.getUrl(storageId);
  if (!imageUrl) {
    return { ok: false, error: "Image stored but URL unavailable" };
  }
  return { ok: true, imageUrl };
}

export const fetchOne = action({
  args: {
    incidentId: v.id("timelineIncidents"),
    force: v.optional(v.boolean()),
  },
  returns: v.object({
    ok: v.boolean(),
    imageUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const inc = await ctx.runQuery(
      internal.incidentImagesInternal.getIncidentForImageFetch,
      { incidentId: args.incidentId },
    );
    if (!inc) {
      return { ok: false, error: "Incident not found" };
    }
    try {
      const result = await fetchAndStoreIncidentImage(
        ctx,
        inc,
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

export const run = action({
  args: {
    force: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    fetched: v.number(),
    skipped: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const force = args.force ?? false;
    const incidents = await ctx.runQuery(
      internal.incidentImagesInternal.listIncidentsForImageFetch,
      {},
    );

    const toProcess =
      args.limit !== undefined ? incidents.slice(0, args.limit) : incidents;

    let fetched = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const inc of toProcess) {
      const cacheKey = buildIncidentImageCacheKey(
        inc.timelineSlug,
        inc.order,
        inc.title,
      );

      if (!force) {
        const cached = await ctx.runQuery(
          internal.incidentImagesInternal.getCacheByKey,
          { cacheKey },
        );
        if (cached) {
          if (!inc.relatedImageStorageId) {
            await ctx.runMutation(
              internal.incidentImagesInternal.patchIncidentImage,
              { incidentId: inc.incidentId, storageId: cached.storageId },
            );
          }
          skipped++;
          continue;
        }

        if (inc.relatedImageStorageId) {
          skipped++;
          continue;
        }
      }

      const searchQuery = buildIncidentImageSearchQuery(
        inc.title,
        inc.location,
        inc.year,
      );

      try {
        const results = await searchImages(searchQuery, { num: 5 });
        const image = await fetchFirstValidImage(results);

        if (!image) {
          failed++;
          errors.push(`${cacheKey}: no downloadable image from Serper`);
          await delay(500);
          continue;
        }

        const storageId = await ctx.storage.store(image.blob);

        const existing = await ctx.runQuery(
          internal.incidentImagesInternal.getCacheByKey,
          { cacheKey },
        );
        if (existing && force) {
          await ctx.runMutation(internal.incidentImagesInternal.patchCache, {
            cacheId: existing._id,
            storageId,
            searchQuery,
            sourceUrl: image.sourceUrl,
          });
        } else if (!existing) {
          await ctx.runMutation(internal.incidentImagesInternal.insertCache, {
            cacheKey,
            storageId,
            searchQuery,
            sourceUrl: image.sourceUrl,
          });
        }

        await ctx.runMutation(internal.incidentImagesInternal.patchIncidentImage, {
          incidentId: inc.incidentId,
          storageId,
        });

        fetched++;
        await delay(500);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${cacheKey}: ${msg}`);
        await delay(500);
      }
    }

    return { fetched, skipped, failed, errors };
  },
});
