import { countryCacheSuffix } from "./imageSearchCountry";

/** Cache key for Serper images on simulation timeline events (museum + curated). */
export function buildSimulationEventCacheKey(
  simulationId: string,
  eventIndex: number,
  title: string,
  country: string,
): string {
  const slugified = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `sim:${simulationId}:evt:${eventIndex}:${slugified}:geo-${countryCacheSuffix(country)}`;
}

export function buildSimulationEventSearchQuery(
  eventTitle: string,
  eventYear: string,
  country: string,
  location?: string,
  artifactName?: string,
  era?: string,
): string {
  const parts = [
    `"${eventTitle}"`,
    country,
    location,
    eventYear,
    artifactName,
    era,
    "historical photo",
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.join(" ");
}
