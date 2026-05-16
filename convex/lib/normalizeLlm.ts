import type { ImpactLevel } from "../types/contracts";

/** Coerce Groq JSON variants (e.g. 8.0) into schema impact levels. */
export function normalizeImpactLevel(value: unknown): ImpactLevel {
  if (value === "low" || value === "medium" || value === "high") return value;
  if (typeof value === "number") {
    if (value >= 7) return "high";
    if (value >= 4) return "medium";
    return "low";
  }
  if (typeof value === "string") {
    const s = value.toLowerCase();
    if (s === "low" || s === "medium" || s === "high") return s;
  }
  return "medium";
}

export function normalizeTimelineEvents<
  T extends { year?: unknown; impactLevel?: unknown },
>(events: T[]): Array<T & { year: string; impactLevel: ImpactLevel }> {
  return events.map((e) => ({
    ...e,
    year: e.year == null ? "" : String(e.year),
    impactLevel: normalizeImpactLevel(e.impactLevel),
  }));
}

export type BranchChoiceLike = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  chaosImpact?: unknown;
};

/** Groq often returns numeric ids (e.g. 1.0); Convex validators require strings. */
export function normalizeBranchChoices<T extends BranchChoiceLike>(
  choices: T[],
): Array<{ id: string; title: string; description: string; chaosImpact?: number }> {
  return choices.map((c, index) => {
    const id =
      c.id == null || c.id === ""
        ? `choice_${index + 1}`
        : String(c.id);
    const normalized: {
      id: string;
      title: string;
      description: string;
      chaosImpact?: number;
    } = {
      id,
      title: c.title == null ? "" : String(c.title),
      description: c.description == null ? "" : String(c.description),
    };
    if (typeof c.chaosImpact === "number" && !Number.isNaN(c.chaosImpact)) {
      normalized.chaosImpact = c.chaosImpact;
    }
    return normalized;
  });
}
