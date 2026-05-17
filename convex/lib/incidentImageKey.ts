import { countryCacheSuffix } from "./imageSearchCountry";

/** Stable cache key for incident images (survives re-seed). */
export function buildIncidentImageCacheKey(
  timelineSlug: string,
  order: number,
  title: string,
  country: string,
): string {
  const slugified = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${timelineSlug}:${order}:${slugified}:geo-${countryCacheSuffix(country)}`;
}

export function buildIncidentImageSearchQuery(
  title: string,
  country: string,
  location?: string,
  year?: string,
): string {
  const parts = [
    `"${title}"`,
    country,
    location,
    year,
    "historical photo",
  ].filter((p): p is string => Boolean(p && p.trim()));
  return parts.join(" ");
}
