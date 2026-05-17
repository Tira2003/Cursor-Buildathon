/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_analyzeMuseumPhotos from "../actions/analyzeMuseumPhotos.js";
import type * as actions_fetchIncidentImages from "../actions/fetchIncidentImages.js";
import type * as actions_fetchSimulationEventImages from "../actions/fetchSimulationEventImages.js";
import type * as actions_generatePhaseOne from "../actions/generatePhaseOne.js";
import type * as actions_generatePhaseTwo from "../actions/generatePhaseTwo.js";
import type * as actions_generateRelicImage from "../actions/generateRelicImage.js";
import type * as actions_generateTimelineFromDuration from "../actions/generateTimelineFromDuration.js";
import type * as actions_stabilizeTimeline from "../actions/stabilizeTimeline.js";
import type * as actions_suggestTimeDurations from "../actions/suggestTimeDurations.js";
import type * as auth from "../auth.js";
import type * as authStatus from "../authStatus.js";
import type * as communityStats from "../communityStats.js";
import type * as devSeed from "../devSeed.js";
import type * as engine from "../engine.js";
import type * as http from "../http.js";
import type * as incidentImagesInternal from "../incidentImagesInternal.js";
import type * as incidents from "../incidents.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_billingRates from "../lib/billingRates.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_demo from "../lib/demo.js";
import type * as lib_demoFixtures from "../lib/demoFixtures.js";
import type * as lib_eventImageKey from "../lib/eventImageKey.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_geminiErrors from "../lib/geminiErrors.js";
import type * as lib_groq from "../lib/groq.js";
import type * as lib_imageSearchCountry from "../lib/imageSearchCountry.js";
import type * as lib_incidentImageKey from "../lib/incidentImageKey.js";
import type * as lib_llmErrors from "../lib/llmErrors.js";
import type * as lib_mapSimulation from "../lib/mapSimulation.js";
import type * as lib_normalizeChoices from "../lib/normalizeChoices.js";
import type * as lib_normalizeTimeline from "../lib/normalizeTimeline.js";
import type * as lib_recordApiUsage from "../lib/recordApiUsage.js";
import type * as lib_resolveIncidentImageUrl from "../lib/resolveIncidentImageUrl.js";
import type * as lib_serper from "../lib/serper.js";
import type * as museumScans from "../museumScans.js";
import type * as museumScansInternal from "../museumScansInternal.js";
import type * as platformStats from "../platformStats.js";
import type * as published from "../published.js";
import type * as remix from "../remix.js";
import type * as seed_demoData from "../seed/demoData.js";
import type * as seed_patchExampleWhatIfs from "../seed/patchExampleWhatIfs.js";
import type * as seed_run from "../seed/run.js";
import type * as simulationImagesInternal from "../simulationImagesInternal.js";
import type * as simulations from "../simulations.js";
import type * as simulationsInternal from "../simulationsInternal.js";
import type * as stabilization from "../stabilization.js";
import type * as storage from "../storage.js";
import type * as timelines from "../timelines.js";
import type * as types_contracts from "../types/contracts.js";
import type * as usage from "../usage.js";
import type * as usageInternal from "../usageInternal.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/analyzeMuseumPhotos": typeof actions_analyzeMuseumPhotos;
  "actions/fetchIncidentImages": typeof actions_fetchIncidentImages;
  "actions/fetchSimulationEventImages": typeof actions_fetchSimulationEventImages;
  "actions/generatePhaseOne": typeof actions_generatePhaseOne;
  "actions/generatePhaseTwo": typeof actions_generatePhaseTwo;
  "actions/generateRelicImage": typeof actions_generateRelicImage;
  "actions/generateTimelineFromDuration": typeof actions_generateTimelineFromDuration;
  "actions/stabilizeTimeline": typeof actions_stabilizeTimeline;
  "actions/suggestTimeDurations": typeof actions_suggestTimeDurations;
  auth: typeof auth;
  authStatus: typeof authStatus;
  communityStats: typeof communityStats;
  devSeed: typeof devSeed;
  engine: typeof engine;
  http: typeof http;
  incidentImagesInternal: typeof incidentImagesInternal;
  incidents: typeof incidents;
  "lib/auth": typeof lib_auth;
  "lib/billingRates": typeof lib_billingRates;
  "lib/constants": typeof lib_constants;
  "lib/demo": typeof lib_demo;
  "lib/demoFixtures": typeof lib_demoFixtures;
  "lib/eventImageKey": typeof lib_eventImageKey;
  "lib/gemini": typeof lib_gemini;
  "lib/geminiErrors": typeof lib_geminiErrors;
  "lib/groq": typeof lib_groq;
  "lib/imageSearchCountry": typeof lib_imageSearchCountry;
  "lib/incidentImageKey": typeof lib_incidentImageKey;
  "lib/llmErrors": typeof lib_llmErrors;
  "lib/mapSimulation": typeof lib_mapSimulation;
  "lib/normalizeChoices": typeof lib_normalizeChoices;
  "lib/normalizeTimeline": typeof lib_normalizeTimeline;
  "lib/recordApiUsage": typeof lib_recordApiUsage;
  "lib/resolveIncidentImageUrl": typeof lib_resolveIncidentImageUrl;
  "lib/serper": typeof lib_serper;
  museumScans: typeof museumScans;
  museumScansInternal: typeof museumScansInternal;
  platformStats: typeof platformStats;
  published: typeof published;
  remix: typeof remix;
  "seed/demoData": typeof seed_demoData;
  "seed/patchExampleWhatIfs": typeof seed_patchExampleWhatIfs;
  "seed/run": typeof seed_run;
  simulationImagesInternal: typeof simulationImagesInternal;
  simulations: typeof simulations;
  simulationsInternal: typeof simulationsInternal;
  stabilization: typeof stabilization;
  storage: typeof storage;
  timelines: typeof timelines;
  "types/contracts": typeof types_contracts;
  usage: typeof usage;
  usageInternal: typeof usageInternal;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
