"use node";

import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Serper Images API — https://serper.dev/images */
const SERPER_IMAGES_URL = "https://google.serper.dev/images";

const PREFERRED_DOMAINS = [
  "wikimedia.org",
  "wikipedia.org",
  "loc.gov",
  "britannica.com",
  "history.com",
  "nationalgeographic.com",
  "si.edu",
  "metmuseum.org",
  "britishmuseum.org",
];

export type SerperImageResult = {
  title: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  link?: string;
};

type SerperImagesResponse = {
  images?: Array<{
    title?: string;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    thumbnailUrl?: string;
    link?: string;
  }>;
};

function getApiKey(): string {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    throw new Error("SERPER_API_KEY is not set in Convex environment");
  }
  return key;
}

export function buildImageSearchQuery(
  year: string,
  title: string,
  context?: string,
): string {
  const base = `${year} ${title} historical photograph`.trim();
  const withContext = context ? `${base} ${context}` : base;
  return withContext.slice(0, 120);
}

export async function searchImages(
  query: string,
  options?: { num?: number; gl?: string; hl?: string },
): Promise<SerperImageResult[]> {
  const res = await fetch(SERPER_IMAGES_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: options?.num ?? 10,
      gl: options?.gl ?? "us",
      hl: options?.hl ?? "en",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper images failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as SerperImagesResponse;
  return (data.images ?? [])
    .filter((img): img is NonNullable<SerperImagesResponse["images"]>[number] & { imageUrl: string } =>
      Boolean(img.imageUrl),
    )
    .map((img) => ({
      title: img.title ?? "",
      imageUrl: img.imageUrl,
      imageWidth: img.imageWidth,
      imageHeight: img.imageHeight,
      thumbnailUrl: img.thumbnailUrl,
      link: img.link,
    }));
}

function domainScore(url: string): number {
  try {
    const host = new URL(url).hostname.toLowerCase();
    for (let i = 0; i < PREFERRED_DOMAINS.length; i++) {
      if (host.includes(PREFERRED_DOMAINS[i])) {
        return PREFERRED_DOMAINS.length - i;
      }
    }
  } catch {
    return 0;
  }
  return 0;
}

export function pickBestImageResult(
  results: SerperImageResult[],
): SerperImageResult | null {
  if (results.length === 0) return null;

  const scored = results.map((r) => {
    const w = r.imageWidth ?? 0;
    const h = r.imageHeight ?? 0;
    const minDim = w && h ? Math.min(w, h) : w || h || 0;
    let score = domainScore(r.imageUrl) * 100;
    if (minDim >= 400) score += 50;
    else if (minDim >= 200) score += 20;
    if (r.imageUrl.includes(".svg")) score -= 100;
    return { r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.r ?? null;
}

export async function downloadImageToStorage(
  ctx: ActionCtx,
  imageUrl: string,
): Promise<Id<"_storage">> {
  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent": "AltEra/1.0 (historical timeline enrichment)",
    },
  });
  if (!res.ok) {
    throw new Error(`Image download failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();
  const blob = new Blob([buffer], {
    type: contentType.startsWith("image/") ? contentType : "image/jpeg",
  });
  return await ctx.storage.store(blob);
}
