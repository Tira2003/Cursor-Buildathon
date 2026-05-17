/** Stable cache key for incident images (survives re-seed). */
export function buildIncidentImageCacheKey(
  timelineSlug: string,
  order: number,
  title: string,
): string {
  const slugified = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${timelineSlug}:${order}:${slugified}`;
}

export function buildIncidentImageSearchQuery(
  title: string,
  location?: string,
  year?: string,
): string {
  const parts = [`"${title}"`, location, year, "historical photo"].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.join(" ");
}
