/** Stable cache key for incident-scoped event images (year + title). */
export function normalizeEventKey(year: string, title: string): string {
  const y = String(year).trim().toLowerCase();
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  return `${y}|${t}`;
}
