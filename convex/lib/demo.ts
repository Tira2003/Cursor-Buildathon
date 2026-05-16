import demoMuseum from "../seed/demoMuseum.json";
import demoStabilizeWin from "../seed/demoStabilizeWin.json";
import demoSimulation from "../seed/demoSimulation.json";

export function isDemoMode(demo?: boolean): boolean {
  if (demo === true) return true;
  if (demo === false) return false;
  return process.env.DEMO_MODE === "true";
}

export { demoMuseum, demoStabilizeWin, demoSimulation };
