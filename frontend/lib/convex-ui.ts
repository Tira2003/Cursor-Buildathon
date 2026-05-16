import type { Doc, Id } from "@/convex/_generated/dataModel";
import type {
  Branch,
  Incident,
  LedgerItem,
  Simulation,
  SimulationStatus,
  StoryCard,
  Timeline,
} from "@/lib/types";

type ConvexTimeline = {
  _id: Id<"predefinedTimelines">;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string;
  startYear: number;
  endYear: number;
};

type ConvexIncident = {
  _id: Id<"timelineIncidents">;
  year: string;
  title: string;
  description: string;
  location?: string;
  relatedImageUrl?: string;
  realOutcome: string;
  order: number;
  exampleWhatIfs?: string[];
};

type ConvexSimulation = ReturnType<typeof mapSimInput>;

function mapSimInput(sim: {
  _id: Id<"simulations">;
  changedIncidentId?: Id<"timelineIncidents">;
  whatIfPrompt?: string;
  chaosScore?: number;
  status: string;
  immediateRipple?: {
    year: string
    title: string
    description: string
    imageUrl?: string
  }[];
  generationalShift?: {
    year: string
    title: string
    description: string
    imageUrl?: string
  }[];
  globalConsequence?: {
    year: string
    title: string
    description: string
    imageUrl?: string
  }[];
  branchChoices?: {
    id: string
    title: string
    description: string
    chaosImpact?: number
  }[];
  selectedBranchId?: string;
  lostToHistory?: string[];
  gainedByHumanity?: string[];
  relicPrompt?: string;
  relicImageUrl?: string;
  events: { year: string; title: string; description: string }[];
  createdAt: number;
}) {
  return sim;
}

export type EditableTimelineEvent = {
  year: string
  title: string
  description: string
  impactLevel: 'low' | 'medium' | 'high'
  imageUrl?: string
}

type EventLike = {
  year: string
  title: string
  description: string
  impactLevel?: 'low' | 'medium' | 'high'
  imageUrl?: string
}

export function collectEditableEvents(sim: {
  events: EventLike[]
  immediateRipple?: EventLike[]
  generationalShift?: EventLike[]
  globalConsequence?: EventLike[]
}): EditableTimelineEvent[] {
  const withImpact = (e: EventLike): EditableTimelineEvent => ({
    year: e.year,
    title: e.title,
    description: e.description,
    impactLevel: e.impactLevel ?? 'medium',
    imageUrl: e.imageUrl,
  })

  if (sim.events.length > 0) {
    return sim.events.map(withImpact)
  }

  return [
    ...(sim.immediateRipple ?? []),
    ...(sim.generationalShift ?? []),
    ...(sim.globalConsequence ?? []),
  ].map(withImpact)
}

export function formatRipple(
  ev: { year: string; title: string; description: string },
): string {
  return `${ev.year} — ${ev.title}: ${ev.description}`;
}

export function mapConvexStatus(status: string): SimulationStatus {
  switch (status) {
    case "draft":
    case "analyzing":
    case "generating":
      return "generating";
    case "phase1":
      return "phase1_complete";
    case "phase2":
      return "phase2_generating";
    case "editable":
    case "saved":
      return "generated";
    case "published":
      return "published";
    default:
      return "generating";
  }
}

export function mapTimelineListItem(t: ConvexTimeline): Timeline {
  return {
    slug: t.slug,
    title: t.title,
    era: `${t.startYear}–${t.endYear}`,
    coverImage: t.coverImageUrl,
    description: t.summary,
    incidents: [],
  };
}

export function mapTimelineDetail(
  timeline: ConvexTimeline,
  incidents: ConvexIncident[],
): Timeline {
  return {
    ...mapTimelineListItem(timeline),
    incidents: incidents.map(mapIncident),
  };
}

export function mapIncident(inc: ConvexIncident): Incident {
  return {
    id: inc._id,
    title: inc.title,
    date: inc.year,
    description: inc.description,
    context: inc.realOutcome,
    image: inc.relatedImageUrl,
    exampleWhatIfs: inc.exampleWhatIfs,
  };
}

export function mapSimulationToUi(
  sim: ConvexSimulation,
  incident?: ConvexIncident | null,
): Simulation {
  const immediate =
    sim.immediateRipple?.length
      ? sim.immediateRipple
      : sim.events.slice(0, Math.ceil(sim.events.length / 2));
  const generational =
    sim.generationalShift?.length
      ? sim.generationalShift
      : sim.events.slice(Math.ceil(sim.events.length / 2));

  const ripples = [...immediate, ...generational].map(formatRipple);

  const storyCards: StoryCard[] = [
    ...immediate.map((ev, i) => eventToStoryCard(ev, `imm-${i}`, true)),
    ...generational.map((ev, i) => eventToStoryCard(ev, `gen-${i}`, true)),
    ...(sim.globalConsequence ?? []).map((ev, i) =>
      eventToStoryCard(ev, `glob-${i}`, true),
    ),
  ];

  const defaultBranchImpact: Record<string, number> = {
    branch_1: -15,
    branch_2: -25,
    branch_3: 30,
  }

  const branches: Branch[] = (sim.branchChoices ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    chaosImpact: b.chaosImpact ?? defaultBranchImpact[b.id] ?? 0,
  }));

  const extinct: LedgerItem[] = (sim.lostToHistory ?? []).map((name, i) => ({
    id: `lost-${i}`,
    name,
    description: "",
  }));

  const born: LedgerItem[] = (sim.gainedByHumanity ?? []).map((name, i) => ({
    id: `gain-${i}`,
    name,
    description: "",
  }));

  return {
    id: sim._id,
    incidentId: sim.changedIncidentId ?? incident?._id ?? "",
    whatIf: sim.whatIfPrompt ?? "",
    chaosScore: sim.chaosScore ?? 0,
    status: mapConvexStatus(sim.status),
    ripples,
    branches,
    selectedBranch: sim.selectedBranchId,
    extinct,
    born,
    relicPrompt: sim.relicPrompt,
    relicImage: sim.relicImageUrl,
    storyCards,
    createdAt: new Date(sim.createdAt).toISOString(),
  };
}

function eventToStoryCard(
  ev: { year: string; title: string; description: string; imageUrl?: string },
  id: string,
  isAlternate: boolean,
): StoryCard {
  return {
    id,
    year: ev.year,
    title: ev.title,
    description: ev.description,
    imagePrompt: ev.title,
    image: ev.imageUrl,
    isAlternate,
  };
}

export const STORY_SLIDE_FALLBACK_IMAGE = '/placeholder.svg'

export function getStorySlidesFromResolvedEvents(
  events: { year: string; title: string; description: string; imageUrl?: string }[],
  fallbackImage: string = STORY_SLIDE_FALLBACK_IMAGE,
): StoryCard[] {
  return events.map((ev, i) => ({
    id: `event-slide-${i}`,
    year: ev.year,
    title: ev.title,
    description: ev.description,
    imagePrompt: ev.title,
    image: ev.imageUrl?.trim() || fallbackImage,
    isAlternate: true,
  }))
}

export type IncidentContext = {
  timeline: Pick<Timeline, "slug" | "title">;
  incident: Incident;
};

export function incidentContextFromConvex(
  timeline: ConvexTimeline,
  incident: ConvexIncident,
): IncidentContext {
  return {
    timeline: { slug: timeline.slug, title: timeline.title },
    incident: mapIncident(incident),
  };
}
