import type { ImpactLevel, TimelineEvent } from "../types/contracts";

/** Coerce LLM output (numbers, strings) into schema-safe impact levels. */
export function normalizeImpactLevel(raw: unknown): ImpactLevel {
  if (raw === "low" || raw === "medium" || raw === "high") {
    return raw;
  }

  if (typeof raw === "string") {
    const s = raw.toLowerCase().trim();
    if (s === "low" || s === "medium" || s === "high") {
      return s;
    }
    const parsed = Number(s);
    if (Number.isFinite(parsed)) {
      return normalizeImpactLevel(parsed);
    }
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw;
    if (n <= 1) {
      if (n <= 0.33) return "low";
      if (n <= 0.66) return "medium";
      return "high";
    }
    if (n <= 10) {
      if (n <= 3) return "low";
      if (n <= 7) return "medium";
      return "high";
    }
    if (n <= 33) return "low";
    if (n <= 66) return "medium";
    return "high";
  }

  return "medium";
}

export function normalizeTimelineEvents(
  events: Array<{
    year?: unknown;
    title?: unknown;
    description?: unknown;
    impactLevel?: unknown;
  }>,
): TimelineEvent[] {
  return events.map((e) => ({
    year: String(e.year ?? ""),
    title: String(e.title ?? "Untitled event"),
    description: String(e.description ?? ""),
    impactLevel: normalizeImpactLevel(e.impactLevel),
  }));
}
