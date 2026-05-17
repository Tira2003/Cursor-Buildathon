import type { Doc } from "../_generated/dataModel";

/** Strip Convex system fields so return validators pass. */
export function mapSimulationDoc(
  sim: Doc<"simulations">,
  relicImageUrl?: string,
  museum?: {
    artifactImageUrl?: string;
    artifactName?: string;
    artifactDescription?: string;
  },
) {
  const museumArtifactImageUrl = museum?.artifactImageUrl;
  return {
    _id: sim._id,
    userId: sim.userId,
    source: sim.source,
    originalTimelineId: sim.originalTimelineId,
    changedIncidentId: sim.changedIncidentId,
    whatIfPrompt: sim.whatIfPrompt,
    museumScanId: sim.museumScanId,
    selectedDurationId: sim.selectedDurationId,
    selectedDurationLabel: sim.selectedDurationLabel,
    events: sim.events,
    immediateRipple: sim.immediateRipple,
    generationalShift: sim.generationalShift,
    globalConsequence: sim.globalConsequence,
    chaosScore: sim.chaosScore,
    lostToHistory: sim.lostToHistory,
    gainedByHumanity: sim.gainedByHumanity,
    branchChoices: sim.branchChoices,
    selectedBranchId: sim.selectedBranchId,
    relicPrompt: sim.relicPrompt,
    relicImageId: sim.relicImageId,
    relicImageUrl: relicImageUrl ?? museumArtifactImageUrl,
    museumArtifactImageUrl,
    museumArtifactName: museum?.artifactName,
    museumArtifactDescription: museum?.artifactDescription,
    isChaotic: sim.isChaotic,
    status: sim.status as string,
    visibility: sim.visibility as string,
    remixOfSimulationId: sim.remixOfSimulationId,
    stabilizedFromSimulationId: sim.stabilizedFromSimulationId,
    createdAt: sim.createdAt,
    updatedAt: sim.updatedAt,
  };
}
