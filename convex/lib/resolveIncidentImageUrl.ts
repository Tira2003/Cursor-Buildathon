import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function resolveIncidentRelatedImageUrl(
  ctx: { storage: QueryCtx["storage"] },
  incident: {
    relatedImageStorageId?: Id<"_storage">;
    relatedImageUrl?: string;
  },
): Promise<string | undefined> {
  if (incident.relatedImageStorageId) {
    const url = await ctx.storage.getUrl(incident.relatedImageStorageId);
    return url ?? undefined;
  }
  return incident.relatedImageUrl;
}
