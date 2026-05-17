"use node";

import { GROQ_TEXT_MODEL, GROQ_VISION_MODEL } from "./billingRates";

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export { GROQ_TEXT_MODEL, GROQ_VISION_MODEL };

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

export type GroqTokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export type GroqChatResult = {
  content: string;
  usage: GroqTokenUsage;
  model: string;
};

export type GenerateJsonResult<T> = {
  data: T;
  usage: GroqTokenUsage;
  model: string;
};

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set in Convex environment");
  }
  return key;
}

/** Groq OpenAI-compatible error body: { error: { message, type, code } } */
export type GroqApiErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

export async function groqChat(
  messages: ChatMessage[],
  model: string,
): Promise<GroqChatResult> {
  const res = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    let parsed: GroqApiErrorBody = {};
    try {
      parsed = JSON.parse(bodyText) as GroqApiErrorBody;
    } catch {
      /* non-JSON body */
    }
    const code = parsed.error?.code ?? "";
    const type = parsed.error?.type ?? "";
    const message = parsed.error?.message ?? bodyText.slice(0, 400);
    throw new Error(
      `Groq API ${res.status}${code ? ` code=${code}` : ""}${type ? ` type=${type}` : ""}: ${message}`,
    );
  }

  const data = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned empty completion content");
  }

  return {
    content,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
    },
    model,
  };
}

async function imageUrlToDataPart(imageUrl: string): Promise<ContentPart> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch image (${res.status}): ${imageUrl.slice(0, 80)}…`,
    );
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new Error("Fetched image is empty");
  }
  const base64 = Buffer.from(buf).toString("base64");
  const headerMime = res.headers.get("content-type")?.split(";")[0].trim();
  const mime =
    headerMime && headerMime.startsWith("image/")
      ? headerMime
      : imageUrl.toLowerCase().includes(".png")
        ? "image/png"
        : "image/jpeg";
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${base64}` },
  };
}

export async function generateJson<T>(
  system: string,
  user: string,
): Promise<GenerateJsonResult<T>> {
  const result = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    GROQ_TEXT_MODEL,
  );
  return {
    data: JSON.parse(result.content) as T,
    usage: result.usage,
    model: result.model,
  };
}

export async function generateJsonWithImages<T>(
  system: string,
  parts: Array<{ text?: string; imageUrl?: string }>,
): Promise<GenerateJsonResult<T>> {
  const content: ContentPart[] = [];
  for (const p of parts) {
    if (p.text) {
      content.push({ type: "text", text: p.text });
    } else if (p.imageUrl) {
      content.push(await imageUrlToDataPart(p.imageUrl));
    }
  }

  const result = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content },
    ],
    GROQ_VISION_MODEL,
  );
  return {
    data: JSON.parse(result.content) as T,
    usage: result.usage,
    model: result.model,
  };
}

/** Groq does not offer image generation; museum relic step skips gracefully. */
export async function generateRelicPng(_prompt: string): Promise<Uint8Array | null> {
  return null;
}
