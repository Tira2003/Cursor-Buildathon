import type { Doc, Id } from "@/convex/_generated/dataModel";
import { resolveIncidentImage, resolveTimelineCoverImage } from "@/lib/timeline-images";
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
  immediateRipple?: { year: string; title: string; description: string }[];
  generationalShift?: { year: string; title: string; description: string }[];
  globalConsequence?: { year: string; title: string; description: string }[];
  branchChoices?: { id: string; title: string; description: string }[];
  selectedBranchId?: string;
  lostToHistory?: string[];
  gainedByHumanity?: string[];
  relicPrompt?: string;
  relicImageUrl?: string;
  museumArtifactImageUrl?: string;
  museumArtifactName?: string;
  museumArtifactDescription?: string;
  selectedDurationLabel?: string;
  source?: string;
  events: {
    year: string;
    title: string;
    description: string;
    impactLevel?: "low" | "medium" | "high";
    imageUrl?: string;
    imageStorageId?: string;
  }[];
  createdAt: number;
}) {
  return sim;
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
    coverImage: resolveTimelineCoverImage(t.slug, t.coverImageUrl),
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
    incidents: incidents.map((inc) => mapIncident(inc, timeline.slug)),
  };
}

export function mapIncident(inc: ConvexIncident, timelineSlug?: string): Incident {
  return {
    id: inc._id,
    title: inc.title,
    date: inc.year,
    description: inc.description,
    context: inc.realOutcome,
    image: timelineSlug
      ? resolveIncidentImage(timelineSlug, inc.relatedImageUrl)
      : inc.relatedImageUrl,
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

  const fallbackImage =
    sim.relicImageUrl ??
    sim.museumArtifactImageUrl ??
    incident?.image ??
    undefined;

  const storyCards: StoryCard[] =
    sim.events.length > 0
      ? sim.events.map((ev, i) =>
          eventToStoryCard(
            ev,
            `evt-${i}`,
            true,
            ev.imageUrl ?? (i === 0 ? fallbackImage : undefined),
            sim._id,
            i,
          ),
        )
      : [
          ...immediate.map((ev, i) =>
            eventToStoryCard(
              ev,
              `imm-${i}`,
              true,
              ev.imageUrl ?? fallbackImage,
              sim._id,
              i,
            ),
          ),
          ...generational.map((ev, i) =>
            eventToStoryCard(
              ev,
              `gen-${i}`,
              true,
              ev.imageUrl ?? fallbackImage,
              sim._id,
              immediate.length + i,
            ),
          ),
          ...(sim.globalConsequence ?? []).map((ev, i) =>
            eventToStoryCard(
              ev,
              `glob-${i}`,
              true,
              ev.imageUrl ?? fallbackImage,
              sim._id,
              immediate.length + generational.length + i,
            ),
          ),
        ];

  const branches: Branch[] = (sim.branchChoices ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    chaosImpact: 0,
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
    whatIf:
      sim.whatIfPrompt ??
      (sim.museumArtifactName
        ? `What if history unfolded across ${sim.selectedDurationLabel ?? "this span"} starting from the ${sim.museumArtifactName}?`
        : ""),
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
  image?: string,
  simulationId?: string,
  eventIndex?: number,
): StoryCard {
  return {
    id,
    year: ev.year,
    title: ev.title,
    description: ev.description,
    imagePrompt: ev.title,
    image: ev.imageUrl ?? image,
    isAlternate,
    simulationId,
    eventIndex,
  };
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
