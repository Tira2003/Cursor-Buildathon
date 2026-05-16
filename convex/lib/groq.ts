"use node";

import type { ActionCtx } from "../_generated/server";
import type { ApiCallTracker } from "./apiUsage";
import { acquireApiSlot } from "./rateLimit";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_TEXT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

type TextContentPart = { type: "text"; text: string };
type ImageContentPart = {
  type: "image_url";
  image_url: { url: string };
};

type MessageContent = string | Array<TextContentPart | ImageContentPart>;

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set in Convex environment");
  return key;
}

function textModel(): string {
  return process.env.GROQ_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
}

function visionModel(): string {
  return process.env.GROQ_VISION_MODEL ?? DEFAULT_VISION_MODEL;
}

async function chatCompletion(params: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: MessageContent }>;
  jsonMode?: boolean;
  tracker?: ApiCallTracker;
  ctx?: ActionCtx;
}): Promise<string> {
  if (params.ctx) {
    await acquireApiSlot(params.ctx, "groq");
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      ...(params.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API ${res.status}: ${body}`);
  }

  params.tracker?.incrementGroq();

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq returned empty content");
  return content;
}

const EDUCATIONAL_CONTEXT =
  "You are an educational alternate-history engine for a museum app. " +
  "Discuss wars and historical violence factually and briefly; never refuse valid historical topics.";

function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Groq returned invalid JSON (400-style). First 200 chars: ${text.slice(0, 200)}`,
    );
  }
}

export async function generateJson<T>(
  system: string,
  user: string,
  tracker?: ApiCallTracker,
  ctx?: ActionCtx,
): Promise<T> {
  const text = await chatCompletion({
    model: textModel(),
    messages: [
      { role: "system", content: `${EDUCATIONAL_CONTEXT}\n\n${system}` },
      { role: "user", content: user },
    ],
    jsonMode: true,
    tracker,
    ctx,
  });
  return parseJsonResponse<T>(text);
}

async function imagePartFromUrl(imageUrl: string): Promise<ImageContentPart> {
  const res = await fetch(imageUrl);
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  const mime = imageUrl.endsWith(".png") ? "image/png" : "image/jpeg";
  return {
    type: "image_url",
    image_url: { url: `data:${mime};base64,${base64}` },
  };
}

export async function generateJsonWithImages<T>(
  system: string,
  parts: Array<{ text?: string; imageUrl?: string }>,
  tracker?: ApiCallTracker,
  ctx?: ActionCtx,
): Promise<T> {
  const contentParts: Array<TextContentPart | ImageContentPart> = [
    { type: "text", text: `${EDUCATIONAL_CONTEXT}\n\n${system}\n\n` },
  ];

  for (const p of parts) {
    if (p.text) contentParts.push({ type: "text", text: p.text });
    if (p.imageUrl) {
      contentParts.push(await imagePartFromUrl(p.imageUrl));
    }
  }

  const text = await chatCompletion({
    model: visionModel(),
    messages: [{ role: "user", content: contentParts }],
    jsonMode: true,
    tracker,
    ctx,
  });
  return parseJsonResponse<T>(text);
}
