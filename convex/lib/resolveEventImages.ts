import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { ImpactLevel, TimelineEvent } from "../types/contracts";

type StoredEvent = {
  year: string;
  title: string;
  description: string;
  impactLevel: ImpactLevel;
  imageStorageId?: Id<"_storage">;
};

type StorageReader = {
  storage: {
    getUrl: (id: Id<"_storage">) => Promise<string | null>;
  };
};

export async function resolveEventListWithStorage(
  ctx: StorageReader,
  events: StoredEvent[],
): Promise<TimelineEvent[]> {
  return Promise.all(
    events.map(async (ev) => {
      if (!ev.imageStorageId) return ev as TimelineEvent;
      const imageUrl = await ctx.storage.getUrl(ev.imageStorageId);
      return {
        ...ev,
        imageUrl: imageUrl ?? undefined,
      };
    }),
  );
}

export async function resolveEventList(
  ctx: QueryCtx,
  events: StoredEvent[],
): Promise<TimelineEvent[]> {
  return resolveEventListWithStorage(ctx, events);
}

export async function resolveSimulationEventFields(
  ctx: QueryCtx,
  sim: {
    events: StoredEvent[];
    immediateRipple?: StoredEvent[];
    generationalShift?: StoredEvent[];
    globalConsequence?: StoredEvent[];
  },
): Promise<{
  events: TimelineEvent[];
  immediateRipple?: TimelineEvent[];
  generationalShift?: TimelineEvent[];
  globalConsequence?: TimelineEvent[];
}> {
  const [events, immediateRipple, generationalShift, globalConsequence] =
    await Promise.all([
      resolveEventList(ctx, sim.events),
      sim.immediateRipple
        ? resolveEventList(ctx, sim.immediateRipple)
        : Promise.resolve(undefined),
      sim.generationalShift
        ? resolveEventList(ctx, sim.generationalShift)
        : Promise.resolve(undefined),
      sim.globalConsequence
        ? resolveEventList(ctx, sim.globalConsequence)
        : Promise.resolve(undefined),
    ]);

  return { events, immediateRipple, generationalShift, globalConsequence };
}
