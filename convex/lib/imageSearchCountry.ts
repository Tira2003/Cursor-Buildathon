/** Map curated timeline slugs to a country/region for Serper image search. */
const TIMELINE_SLUG_COUNTRY: Record<string, string> = {
  anuradhapura: "Sri Lanka",
  polonnaruwa: "Sri Lanka",
  mahanuwara: "Sri Lanka",
  "roman-empire": "Italy",
  wwi: "Europe",
};

const TEXT_COUNTRY_HINTS: Array<{ pattern: RegExp; country: string }> = [
  {
    pattern:
      /polonnaruwa|anuradhapura|mihintale|sigiriya|colombo|kandy|ceylon|sinhalese|chola|lanka|danture|matara|uva|wellassa|magul maduwa/i,
    country: "Sri Lanka",
  },
  {
    pattern:
      /\b(rome|ravenna|milan|constantinople|actium|pompey|italy)\b/i,
    country: "Italy",
  },
  {
    pattern:
      /\b(france|germany|belgium|somme|versailles|sarajevo|bosnia|petrograd|russia)\b/i,
    country: "Europe",
  },
  { pattern: /\b(mexico|washington)\b/i, country: "United States" },
  { pattern: /\b(celtic sea|britain|british)\b/i, country: "United Kingdom" },
];

function countryFromCommaLocation(location: string): string | undefined {
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return undefined;
  const last = parts[parts.length - 1];
  if (last.length < 3 || last.length > 48) return undefined;
  return last;
}

/**
 * Resolve a country/region label for Serper queries.
 * Always returns a non-empty string so searches stay geographically grounded.
 */
export function resolveImageSearchCountry(options: {
  timelineSlug?: string;
  location?: string;
  title?: string;
  historicalContext?: string;
}): string {
  const blob = [options.location, options.title, options.historicalContext]
    .filter(Boolean)
    .join(" ");

  if (options.timelineSlug && TIMELINE_SLUG_COUNTRY[options.timelineSlug]) {
    return TIMELINE_SLUG_COUNTRY[options.timelineSlug];
  }

  if (options.location) {
    const fromComma = countryFromCommaLocation(options.location);
    if (fromComma) return fromComma;
  }

  for (const { pattern, country } of TEXT_COUNTRY_HINTS) {
    if (pattern.test(blob)) return country;
  }

  if (options.timelineSlug === "wwi") return "Europe";
  if (options.timelineSlug === "roman-empire") return "Italy";
  if (
    options.timelineSlug === "anuradhapura" ||
    options.timelineSlug === "polonnaruwa" ||
    options.timelineSlug === "mahanuwara"
  ) {
    return "Sri Lanka";
  }

  if (options.location?.trim()) {
    return options.location.trim();
  }

  return "historical";
}

export function countryCacheSuffix(country: string): string {
  return country
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
