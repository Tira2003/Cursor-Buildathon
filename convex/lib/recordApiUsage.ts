import { internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export type UsageFeature =
  | "museum_analyze"
  | "museum_durations"
  | "timeline_generate"
  | "phase1"
  | "phase2"
  | "stabilize"
  | "incident_image"
  | "simulation_event_image";

export type GroqUsage = {
  prompt_tokens: number;
  completion_tokens: number;
};

export async function recordGroqUsage(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    feature: UsageFeature;
    model: string;
    usage: GroqUsage;
    simulationId?: Id<"simulations">;
    museumScanId?: Id<"museumScans">;
  },
): Promise<void> {
  await ctx.runMutation(internal.usageInternal.recordUsage, {
    userId: args.userId,
    provider: "groq",
    feature: args.feature,
    model: args.model,
    inputTokens: args.usage.prompt_tokens,
    outputTokens: args.usage.completion_tokens,
    simulationId: args.simulationId,
    museumScanId: args.museumScanId,
  });
}

export async function recordSerperUsage(
  ctx: ActionCtx,
  args: {
    userId: Id<"users">;
    feature: UsageFeature;
    serperRequests?: number;
    simulationId?: Id<"simulations">;
    museumScanId?: Id<"museumScans">;
  },
): Promise<void> {
  await ctx.runMutation(internal.usageInternal.recordUsage, {
    userId: args.userId,
    provider: "serper",
    feature: args.feature,
    serperRequests: args.serperRequests ?? 1,
    simulationId: args.simulationId,
    museumScanId: args.museumScanId,
  });
}
