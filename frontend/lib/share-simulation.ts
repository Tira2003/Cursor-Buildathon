export function simulationShareUrl(simulationId: string): string {
  if (typeof window === "undefined") {
    return `/simulation/${simulationId}`;
  }
  return `${window.location.origin}/simulation/${simulationId}`;
}

export async function shareSimulationLink(options: {
  simulationId: string;
  title: string;
}): Promise<"shared" | "copied"> {
  const url = simulationShareUrl(options.simulationId);
  const shareData: ShareData = {
    title: "AltEra — Alternate Timeline",
    text: options.title,
    url,
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
    }
  }

  await navigator.clipboard.writeText(url);
  return "copied";
}
