"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { demoStabilizeWin, isDemoMode } from "../lib/demo";
import { CHAOS_WIN_THRESHOLD } from "../lib/constants";
import { generateJson } from "../lib/gemini";
import { normalizeCorrectiveChoices } from "../lib/normalizeChoices";
import type { TimelineEvent } from "../types/contracts";

export const startChallenge = action({
  args: {
    simulationId: v.id("simulations"),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    correctiveChoices: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
      }),
    ),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    correctiveChoices: { id: string; title: string; description: string }[];
  }> => {
    if (isDemoMode(args.demo)) {
      return { correctiveChoices: demoStabilizeWin.challengeStart.correctiveChoices };
    }

    const sim = await ctx.runQuery(api.simulations.get, {
      simulationId: args.simulationId,
    });
    if (!sim) throw new Error("Simulation not found");
    if (sim.events.length === 0) {
      throw new Error("Simulation has no timeline events to stabilize");
    }

    const data = await generateJson<{
      correctiveChoices: Array<{ id?: unknown; title?: unknown; description?: unknown }>;
    }>(
      `Return JSON with exactly 5 correctiveChoices: [{ "id": "fix_1", "title": "...", "description": "..." }, ...]. Each id must be a string like "fix_1", never a number.`,
      `Chaotic timeline chaos ${sim.chaosScore}. Events: ${sim.events.map((e: { title: string }) => e.title).join("; ")}`,
    );

    if (!data.correctiveChoices?.length) {
      throw new Error("No corrective choices returned from model");
    }

    return { correctiveChoices: normalizeCorrectiveChoices(data.correctiveChoices) };
  },
});

export const submitFixes = action({
  args: {
    simulationId: v.id("simulations"),
    selectedChoiceIds: v.array(v.string()),
    correctiveChoices: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        description: v.string(),
      }),
    ),
    demo: v.optional(v.boolean()),
  },
  returns: v.object({
    resultingChaosScore: v.number(),
    won: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const sim = await ctx.runQuery(api.simulations.get, {
      simulationId: args.simulationId,
    });
    if (!sim) throw new Error("Simulation not found");

    let resultingChaosScore: number;
    let events = sim.events;

    if (isDemoMode(args.demo)) {
      resultingChaosScore = demoStabilizeWin.result.resultingChaosScore;
      if (demoStabilizeWin.result.eventsPatch) {
        events = [
          ...sim.events,
          ...(demoStabilizeWin.result.eventsPatch as TimelineEvent[]),
        ];
      }
    } else {
      const selected = args.correctiveChoices.filter((c) =>
        args.selectedChoiceIds.includes(c.id),
      );
      const data = await generateJson<{ resultingChaosScore: number }>(
        `Given chaotic timeline and fixes, return JSON { resultingChaosScore: number 0-100 }. Good fixes lower score.`,
        `Current chaos: ${sim.chaosScore}. Fixes applied: ${selected.map((c) => c.title).join(", ")}`,
      );
      const score = Number(data.resultingChaosScore);
      resultingChaosScore = Number.isFinite(score)
        ? Math.min(100, Math.max(0, score))
        : Math.max(0, (sim.chaosScore ?? 50) - selected.length * 12);
    }

    const won = resultingChaosScore < CHAOS_WIN_THRESHOLD;

    await ctx.runMutation(internal.simulationsInternal.patchChaos, {
      simulationId: args.simulationId,
      chaosScore: resultingChaosScore,
      events,
    });

    return { resultingChaosScore, won };
  },
});
