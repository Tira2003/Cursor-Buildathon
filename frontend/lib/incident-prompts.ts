import type { Incident } from '@/lib/types'

const MAX_PROMPT_LEN = 200

type IncidentKind =
  | 'assassination'
  | 'battle'
  | 'treaty'
  | 'disaster'
  | 'founding'
  | 'default'

function incidentText(incident: Incident): string {
  return `${incident.title} ${incident.description ?? ''} ${incident.context ?? ''}`.toLowerCase()
}

export function classifyIncidentKind(incident: Incident): IncidentKind {
  const text = incidentText(incident)

  if (
    /\b(assassin|assassinated|killed|shot|stabbed|murdered)\b/.test(text) &&
    !/\bbattle\b/.test(text)
  ) {
    return 'assassination'
  }
  if (/\b(battle|defeated|invasion|invades|siege|annihilate|war)\b/.test(text)) {
    return 'battle'
  }
  if (/\b(treaty|convention|edict|signed|telegram)\b/.test(text)) {
    return 'treaty'
  }
  if (/\b(sunk|torpedo|sinking|liner)\b/.test(text)) {
    return 'disaster'
  }
  if (/\b(arrival|reign|unifies|unified|fall of)\b/.test(text)) {
    return 'founding'
  }
  return 'default'
}

function shortTitle(title: string): string {
  return title.length > 60 ? `${title.slice(0, 57)}…` : title
}

function clampPrompt(s: string): string {
  const t = s.trim()
  if (t.length <= MAX_PROMPT_LEN) return t
  return `${t.slice(0, MAX_PROMPT_LEN - 1)}…`
}

export function buildTemplateWhatIfs(incident: Incident): string[] {
  const title = incident.title
  const kind = classifyIncidentKind(incident)

  let prompts: string[]
  switch (kind) {
    case 'assassination':
      prompts = [
        `What if the plot against ${title} failed?`,
        `What if the target escaped unharmed?`,
        `What if the assassination was discovered beforehand?`,
      ]
      break
    case 'battle':
      prompts = [
        `What if ${title} ended in defeat instead of victory?`,
        `What if the battle never happened?`,
        `What if reinforcements arrived a day earlier?`,
      ]
      break
    case 'treaty':
      prompts = [
        `What if ${title} was never signed?`,
        `What if the treaty imposed harsher terms?`,
        `What if negotiators reached a different compromise?`,
      ]
      break
    case 'disaster':
      prompts = [
        `What if ${title} was prevented?`,
        `What if rescue arrived in time?`,
        `What if the disaster happened under different circumstances?`,
      ]
      break
    case 'founding':
      prompts = [
        `What if ${title} never happened?`,
        `What if it happened a generation later?`,
        `What if a rival leader took power instead?`,
      ]
      break
    default:
      prompts = [
        `What if ${title} never happened?`,
        `What if ${title} happened ten years later?`,
        `What if the outcome of ${title} was reversed?`,
      ]
  }
  return prompts.map(clampPrompt)
}

function curatedWhatIfs(incident: Incident): string[] | null {
  const raw = incident.exampleWhatIfs
  if (!raw || raw.length !== 3) return null
  return raw.map((s) => clampPrompt(s))
}

export function getExampleWhatIfs(incident: Incident): string[] {
  return curatedWhatIfs(incident) ?? buildTemplateWhatIfs(incident)
}

export function getIncidentPlaceholder(incident: Incident): string {
  const title = shortTitle(incident.title)
  const kind = classifyIncidentKind(incident)

  switch (kind) {
    case 'assassination':
      return `What if the plot against "${title}" failed? What if the target escaped? What if…`
    case 'battle':
      return `What if the other side won at "${title}"? What if the battle never happened? What if…`
    case 'treaty':
      return `What if "${title}" was never signed? What if the terms were different? What if…`
    case 'disaster':
      return `What if "${title}" was prevented? What if help arrived in time? What if…`
    case 'founding':
      return `What if "${title}" never happened? What if it unfolded a generation later? What if…`
    default:
      return `What if "${title}" unfolded differently? What if the outcome was reversed? What if…`
  }
}
