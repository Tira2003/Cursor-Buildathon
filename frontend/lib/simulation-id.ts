/** True for Convex document IDs (e.g. kh712ykr47nr9e6v0qhcx2f0n586x5cc). */
export function isConvexSimulationId(id: string): boolean {
  return /^[a-z0-9]{32}$/.test(id);
}

/** Legacy demo / fixture IDs used by mock pages (not stored in Convex). */
export function isMockSimulationId(id: string): boolean {
  return (
    id.startsWith("demo-") ||
    id.startsWith("sim-") ||
    id.startsWith("scan-") ||
    !isConvexSimulationId(id)
  );
}
