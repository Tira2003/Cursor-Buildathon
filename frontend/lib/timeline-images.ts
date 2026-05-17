function publicImagePath(...segments: string[]): string {
  return `/images/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
}

/** Maps Convex seed paths (/seed/…) to bundled public assets. */
const SLUG_TO_COVER: Record<string, string> = {
  anuradhapura: publicImagePath("timelines", "anuradhapura kingdom.png"),
  polonnaruwa: publicImagePath("timelines", "polonnaruwa kingdom.png"),
  mahanuwara: publicImagePath("timelines", "Kandyan kingdom.png"),
  wwi: publicImagePath("timelines", "wwi.jpg"),
  "roman-empire": publicImagePath("timelines", "rome.jpg"),
};

const SEED_FILE_TO_COVER: Record<string, string> = {
  "anuradhapura-cover.jpg": SLUG_TO_COVER.anuradhapura,
  "polonnaruwa-cover.jpg": SLUG_TO_COVER.polonnaruwa,
  "kandy-cover.jpg": SLUG_TO_COVER.mahanuwara,
  "wwi-cover.jpg": SLUG_TO_COVER.wwi,
  "roman-empire-cover.jpg": SLUG_TO_COVER["roman-empire"],
};

export function resolveTimelineCoverImage(slug: string, coverImageUrl: string): string {
  if (coverImageUrl.startsWith("/images/")) {
    return coverImageUrl;
  }

  if (coverImageUrl.startsWith("/seed/")) {
    const file = coverImageUrl.replace("/seed/", "");
    if (SEED_FILE_TO_COVER[file]) {
      return SEED_FILE_TO_COVER[file];
    }
  }

  return SLUG_TO_COVER[slug] ?? publicImagePath("hero", "alternate-timelines.jpg");
}

export function resolveIncidentImage(
  _slug: string,
  relatedImageUrl?: string,
): string | undefined {
  if (!relatedImageUrl) {
    return undefined;
  }
  if (
    relatedImageUrl.startsWith("http://") ||
    relatedImageUrl.startsWith("https://")
  ) {
    return relatedImageUrl;
  }
  if (relatedImageUrl.startsWith("/images/")) {
    return relatedImageUrl;
  }
  if (relatedImageUrl.startsWith("/seed/")) {
    const file = relatedImageUrl.replace("/seed/", "");
    return publicImagePath("incidents", file.replace(/\.jpg$/i, ".jpg"));
  }
  return relatedImageUrl;
}
