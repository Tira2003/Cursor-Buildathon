import type { Incident } from "@/lib/types";

const MAX_PROMPT_LENGTH = 200;

export type IncidentPromptKind =
  | "assassination"
  | "battle"
  | "treaty"
  | "founding"
  | "disaster"
  | "default";

export function detectIncidentKind(incident: Incident): IncidentPromptKind {
  const text = `${incident.title} ${incident.description ?? ""}`.toLowerCase();

  if (
    /assassin|assassination|murder|killed|shot dead|stab/.test(text)
  ) {
    return "assassination";
  }
  if (/treaty|convention|edict|signed|agreement/.test(text)) {
    return "treaty";
  }
  if (/founding|establishes|arrival|introducing|landed|founded/.test(text)) {
    return "founding";
  }
  if (/fire|sinking|torpedo|disaster|plague/.test(text)) {
    return "disaster";
  }
  if (
    /battle|invasion|rebellion|war|defeat|siege|offensive|uprising|raid/.test(
      text,
    )
  ) {
    return "battle";
  }

  return "default";
}

function clampPrompt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_PROMPT_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_PROMPT_LENGTH - 1)}…`;
}

function normalizeCurated(prompts: string[] | undefined): string[] | null {
  if (!prompts || prompts.length !== 3) return null;
  return prompts.map((p) => clampPrompt(p));
}

export function buildTemplateWhatIfs(incident: Incident): string[] {
  const title = incident.title;
  const kind = detectIncidentKind(incident);

  switch (kind) {
    case "assassination":
      return [
        clampPrompt(`What if the plot against ${title} failed?`),
        clampPrompt(`What if the target survived and pursued the conspirators?`),
        clampPrompt(`What if the assassination never happened?`),
      ];
    case "battle":
      return [
        clampPrompt(`What if the other side had won at ${title}?`),
        clampPrompt(`What if ${title} ended in a stalemate instead?`),
        clampPrompt(`What if ${title} never happened?`),
      ];
    case "treaty":
      return [
        clampPrompt(`What if the treaty at ${title} was never signed?`),
        clampPrompt(`What if both sides rejected the terms and kept fighting?`),
        clampPrompt(`What if a harsher peace was imposed instead?`),
      ];
    case "founding":
      return [
        clampPrompt(`What if ${title} had happened decades earlier?`),
        clampPrompt(`What if ${title} failed and the old order continued?`),
        clampPrompt(`What if a rival power blocked ${title}?`),
      ];
    case "disaster":
      return [
        clampPrompt(`What if ${title} had been far less destructive?`),
        clampPrompt(`What if leaders had evacuated before ${title}?`),
        clampPrompt(`What if ${title} was averted entirely?`),
      ];
    default:
      return [
        clampPrompt(`What if ${title} never happened?`),
        clampPrompt(`What if ${title} happened a decade later?`),
        clampPrompt(`What if the outcome of ${title} was reversed?`),
      ];
  }
}

export function getExampleWhatIfs(incident: Incident): string[] {
  const curated = normalizeCurated(incident.exampleWhatIfs);
  if (curated) return curated;
  return buildTemplateWhatIfs(incident);
}

export function getIncidentPlaceholder(incident: Incident): string {
  const kind = detectIncidentKind(incident);
  const title = incident.title;

  switch (kind) {
    case "assassination":
      return `What if the plot against "${title}" failed? What if the target escaped? What if...`;
    case "battle":
      return `What if the other side won at "${title}"? What if the battle never happened? What if...`;
    case "treaty":
      return `What if the treaty was never signed? What if both sides kept fighting? What if...`;
    case "founding":
      return `What if "${title}" never happened? What if it happened decades earlier? What if...`;
    case "disaster":
      return `What if "${title}" was averted? What if the damage was far worse? What if...`;
    default:
      return `What if "${title}" had a different outcome? What if it never happened? What if...`;
  }
}
