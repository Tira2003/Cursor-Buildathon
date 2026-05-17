/** Cache key for Serper images on simulation timeline events (museum + curated). */
export function buildSimulationEventCacheKey(
  simulationId: string,
  eventIndex: number,
  title: string,
): string {
  const slugified = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `sim:${simulationId}:evt:${eventIndex}:${slugified}`;
}

export function buildSimulationEventSearchQuery(
  eventTitle: string,
  eventYear: string,
  artifactName?: string,
  era?: string,
): string {
  const parts = [
    `"${eventTitle}"`,
    eventYear,
    artifactName,
    era,
    "historical photo",
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.join(" ");
}
