"use node";

const SERPER_IMAGES_URL = "https://google.serper.dev/images";

export type SerperImageResult = {
  title: string;
  imageUrl: string;
  link?: string;
};

export type SerperSearchResult = {
  results: SerperImageResult[];
  requestCount: number;
};

export async function searchImages(
  query: string,
  options?: { num?: number },
): Promise<SerperSearchResult> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SERPER_API_KEY is not set. Run: npx convex env set SERPER_API_KEY <key>",
    );
  }

  const response = await fetch(SERPER_IMAGES_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: options?.num ?? 5,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Serper images failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    images?: Array<{
      title?: string;
      imageUrl?: string;
      link?: string;
    }>;
  };

  const results = (data.images ?? [])
    .filter((img): img is { title?: string; imageUrl: string; link?: string } =>
      Boolean(img.imageUrl),
    )
    .map((img) => ({
      title: img.title ?? "",
      imageUrl: img.imageUrl,
      link: img.link,
    }));

  return { results, requestCount: 1 };
}

export async function downloadImage(url: string): Promise<Blob | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "AltEra/1.0 (historical-education; incident-image-backfill)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 4_000) {
      return null;
    }

    return new Blob([buffer], { type: contentType.split(";")[0] });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchFirstValidImage(
  results: SerperImageResult[],
): Promise<{ blob: Blob; sourceUrl: string } | null> {
  for (const result of results) {
    const blob = await downloadImage(result.imageUrl);
    if (blob) {
      return { blob, sourceUrl: result.imageUrl };
    }
  }
  return null;
}
