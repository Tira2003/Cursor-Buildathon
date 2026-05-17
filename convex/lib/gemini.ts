"use node";

/**
 * LLM entrypoint — uses Groq (GROQ_API_KEY in Convex).
 * File name kept for stable imports across actions.
 */
export {
  generateJson,
  generateJsonWithImages,
  generateRelicPng,
} from "./groq";
