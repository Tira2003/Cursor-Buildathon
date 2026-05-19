# AltEra — Low-Level Design (LLD)

> Module-by-module implementation reference. Pair this with the [HLD](HIGH_LEVEL_DESIGN.md) for the bird's-eye view and with the code under `convex/` and `frontend/` for the ground truth.

---

## Table of Contents

1. [Code Layout](#1-code-layout)
2. [Naming & Convex Conventions](#2-naming--convex-conventions)
3. [Data Model](#3-data-model)
4. [Shared Validators & Types](#4-shared-validators--types)
5. [Auth Module](#5-auth-module)
6. [Timeline Catalog Module](#6-timeline-catalog-module)
7. [Simulation Module](#7-simulation-module)
8. [Engine Orchestration Module](#8-engine-orchestration-module)
9. [Phase 1 / Phase 2 Generation Actions](#9-phase-1--phase-2-generation-actions)
10. [Museum Scan Module](#10-museum-scan-module)
11. [Stabilize Game Module](#11-stabilize-game-module)
12. [Publishing & Remix Modules](#12-publishing--remix-modules)
13. [Image Enrichment Module](#13-image-enrichment-module)
14. [Usage & Billing Module](#14-usage--billing-module)
15. [LLM Library (`lib/groq.ts`)](#15-llm-library-libgroqts)
16. [Demo Mode & Fixtures](#16-demo-mode--fixtures)
17. [Frontend Component Map](#17-frontend-component-map)
18. [Error Handling & Edge Cases](#18-error-handling--edge-cases)
19. [Testing Strategy](#19-testing-strategy)
20. [Performance & Cost Notes](#20-performance--cost-notes)

---

## 1. Code Layout

```
convex/
├── schema.ts                # All tables + indexes
├── validators.ts            # Shared v.object/v.union literals
├── auth.config.ts           # Convex Auth providers config
├── auth.ts                  # convexAuth() entry
├── authStatus.ts            # Light queries used by client guards
├── http.ts                  # HTTP router (currently empty)
├── lib/
│   ├── auth.ts              # requireUserId
│   ├── billingRates.ts      # Model constants + USD pricing
│   ├── constants.ts         # CHAOS_WIN_THRESHOLD, CHAOS_CHAOTIC_THRESHOLD
│   ├── demo.ts              # isDemoMode + small demo blobs
│   ├── demoFixtures.ts      # Timeline-specific demo Phase 1/2 fixtures
│   ├── eventImageKey.ts
│   ├── gemini.ts            # Re-exports Groq client (legacy alias)
│   ├── geminiErrors.ts
│   ├── groq.ts              # Real LLM client
│   ├── imageSearchCountry.ts
│   ├── incidentImageKey.ts
│   ├── llmErrors.ts         # isLlmRateLimitError
│   ├── mapSimulation.ts     # DB row -> API doc
│   ├── normalizeChoices.ts  # LLM choice cleaner
│   ├── normalizeTimeline.ts # LLM event cleaner
│   ├── recordApiUsage.ts    # Append-only telemetry helper
│   ├── resolveIncidentImageUrl.ts
│   └── serper.ts            # Serper Images client
├── actions/                 # All "use node" LLM/external calls
│   ├── analyzeMuseumPhotos.ts
│   ├── fetchIncidentImages.ts
│   ├── fetchSimulationEventImages.ts
│   ├── generatePhaseOne.ts
│   ├── generatePhaseTwo.ts
│   ├── generateTimelineFromDuration.ts
│   ├── generateRelicImage.ts
│   ├── stabilizeTimeline.ts
│   └── suggestTimeDurations.ts
├── seed/                    # Curated timelines + demo data
├── types/
│   └── contracts.ts         # Shared TS types (TimelineEvent, BranchChoice)
└── *.ts                     # One file per public domain area
```

The frontend mirrors backend boundaries: each domain (simulate, simulation, dashboard, stabilize, museum, timelines) has its own `app/` route folder and `components/` folder.

---

## 2. Naming & Convex Conventions

- **Public functions** (`query`, `mutation`, `action`) live in top-level `convex/*.ts` files and export named functions. They must declare both `args` and `returns` validators.
- **Internal functions** (`internalQuery`, `internalMutation`, `internalAction`) live in `*Internal.ts` files (`simulationsInternal.ts`, `museumScansInternal.ts`, `usageInternal.ts`). They can return `any`-shaped data because they are only consumed by other server code.
- **Node actions** (anything touching `fetch`, image processing, or large dependencies) MUST start with `"use node";` and live under `convex/actions/`.
- **Mutations never call other mutations directly**; orchestration goes through actions.
- **Authentication**: every public function either calls `requireUserId(ctx)` (mutations) or checks `getAuthUserId(ctx)` (queries) before reading per-user data. Visibility checks happen before returning private documents.

---

## 3. Data Model

Source of truth: [`convex/schema.ts`](../convex/schema.ts).

### 3.1 `users` + auth tables

Provided by `authTables` from `@convex-dev/auth/server`. Spread into the schema at the top — never edited directly.

### 3.2 `predefinedTimelines`

| field             | type             | notes                                  |
|-------------------|------------------|----------------------------------------|
| title             | string           | "World War I"                          |
| slug              | string           | URL-safe, **indexed `by_slug`**        |
| summary           | string           | Card subtitle                          |
| coverImageUrl     | string           | `/seed/...` or absolute                |
| startYear, endYear| number           | UI badges                              |
| createdAt         | number           | epoch ms                               |

### 3.3 `timelineIncidents`

| field               | type                       | notes                              |
|---------------------|----------------------------|------------------------------------|
| timelineId          | id("predefinedTimelines") | FK                                  |
| year                | string                    | "1914-06-28"                        |
| title, description  | string                    |                                    |
| location            | string?                   |                                    |
| relatedImageUrl     | string?                   | Cached Serper URL                  |
| relatedImageStorageId | id("_storage")?         | When stored in Convex              |
| realOutcome         | string                    | Feeds LLM prompt                   |
| order               | number                    | **indexed `by_timeline_order`**    |
| exampleWhatIfs      | string[]?                 | Optional prompt seeds              |

### 3.4 `simulations` (central table)

Indexes:

- `by_user_updated` (user inbox)
- `by_visibility_created` (public feed)
- `by_chaotic_public` (stabilize game targets)

State machine via `status`:

```
draft → analyzing(*museum only*) → generating → phase1 → phase2 → saved → published
```

Branching fields are nullable until populated by the corresponding action:

| field                  | populated by                                  |
|------------------------|-----------------------------------------------|
| chaosScore             | Phase 1                                       |
| immediateRipple        | Phase 1                                       |
| generationalShift      | Phase 1                                       |
| branchChoices          | Phase 1                                       |
| selectedBranchId       | `simulations.selectBranch` mutation           |
| globalConsequence      | Phase 2                                       |
| lostToHistory, gainedByHumanity | Phase 2                              |
| relicPrompt            | Phase 2                                       |
| relicImageId           | `actions.generateRelicImage` (best-effort)    |
| isChaotic              | `published.publish` (chaosScore ≥ 75)         |
| events                 | Phase 2 (curated) or `generateTimelineFromDuration` (museum) |

### 3.5 `museumScans`

State: `uploaded → analyzed → confirmed`. Owns artifact + label storage IDs and the extracted strings used to seed `simulations`.

### 3.6 `publishedTimelines`

One row per published simulation. Indexed `by_created` (feed) and `by_simulation` (idempotent publish).

### 3.7 `remixes`, `stabilizationAttempts`, `playerStats`

- `remixes` records the (original, remixed) pair plus the new what-if.
- `stabilizationAttempts` is a per-play log (won / lost / chaosResult).
- `playerStats` is the per-user rollup (1 row per user, indexed `by_user`).

### 3.8 Telemetry tables

- `apiUsageEvents` — append-only per-call record (provider, feature, model, tokens, costUsd).
- `userUsageTotals` — rollup (`by_user`) updated on every call.
- `incidentImageCache` — keyed by cacheKey for Serper image idempotency.

---

## 4. Shared Validators & Types

`convex/validators.ts` exports the canonical literals reused across tables and function signatures:

```ts
impactLevel        // "low" | "medium" | "high"
timelineEvent      // { year, title, description, impactLevel, imageStorageId?, imageUrl? }
branchChoice       // { id, title, description, chaosImpact? }
simulationSource   // "museum" | "curated"
simulationStatus   // draft | analyzing | generating | phase1 | phase2 | editable | saved | published
visibility         // "private" | "public"
museumScanStatus   // uploaded | analyzed | confirmed
apiUsageProvider   // "groq" | "serper"
apiUsageFeature    // phase1 | phase2 | museum_analyze | museum_durations |
                   // timeline_generate | stabilize | incident_image | simulation_event_image
```

Shared TS types (consumed by actions and the frontend) live in [`convex/types/contracts.ts`](../convex/types/contracts.ts).

---

## 5. Auth Module

### Files

- `convex/auth.config.ts`
- `convex/auth.ts` — wires `convexAuth(...)` with two providers.
- `convex/lib/auth.ts` — `requireUserId(ctx)` helper.
- `convex/authStatus.ts` — exposes lightweight queries (e.g. `isSignedIn`) consumed by the client.

### Provider config

- **Google OAuth** — uses Google's `sub` as the stable identity. Email is normalized to lower-case. Name / picture are optional.
- **Password** — email + name only (no extra profile fields).

### Helpers

```ts
// convex/lib/auth.ts
export async function requireUserId(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
```

Every public mutation calls this on entry.

---

## 6. Timeline Catalog Module

### Files

- `convex/timelines.ts` — public queries for curated timelines + incidents.
- `convex/incidents.ts` — supporting queries (e.g. by incident id).
- `convex/seed/*` — seed data.
- `convex/devSeed.ts` — bootstrap script.

### Key functions

| Function                          | Kind     | Returns                                |
|-----------------------------------|----------|----------------------------------------|
| `timelines.list`                  | query    | `PredefinedTimeline[]`                 |
| `timelines.getBySlug({ slug })`   | query    | `PredefinedTimeline \| null`           |
| `timelines.incidentsFor({ timelineId })` | query | `TimelineIncident[]`                |
| `incidents.get({ incidentId })`   | query    | `TimelineIncident \| null`             |

Indexes used: `predefinedTimelines.by_slug`, `timelineIncidents.by_timeline_order`.

---

## 7. Simulation Module

Files: `convex/simulations.ts` (public), `convex/simulationsInternal.ts` (internal patches).

### Public surface

| Function                | Kind     | Auth   | Notes                                                  |
|-------------------------|----------|--------|--------------------------------------------------------|
| `createDraft`           | mutation | yes    | Inserts new sim; bumps `playerStats.totalSimulations`. |
| `get({ simulationId })` | query    | partial| Returns `null` for private sims viewed by non-owner.   |
| `getPublic`             | query    | none   | Public-only.                                           |
| `listMine`              | query    | yes    | Inbox ordered by `updatedAt` desc.                     |
| `selectBranch`          | mutation | yes    | Sets `selectedBranchId`, transitions to `phase2`.      |
| `updateEvents`          | mutation | yes    | Inline edits to the events array.                      |
| `save`                  | mutation | yes    | `status = saved`.                                      |
| `makePublic`            | mutation | yes    | Sets `visibility = public` (used for shared links).    |
| `setGenerating`         | mutation | yes    | Idempotent transition into `generating`.               |
| `setMuseumDuration`     | mutation | yes    | Stores selected duration label for museum sims.        |

### Internal surface (`simulationsInternal.ts`)

- `getGenerationContext` — gathers everything a phase action needs (incident description, real outcome, what-if, chosen branch, prior chaos).
- `getMuseumTimelineContext` — analogous for museum sims.
- `getSimulationOwnerUserId` — used by actions to attach telemetry.
- `patchPhase1` / `patchPhase2` / `patchMuseumTimeline` / `patchChaos` — write-only mutations consumed by actions.

### Visibility rule

```ts
if (sim.visibility === "private" && sim.userId !== userId) return null;
```

is the single line that enforces privacy across the entire app. It lives only in `simulations.get`.

### Storage URL resolution

The `get` query rewrites storage IDs to short-lived URLs:

- `relicImageUrl` from `relicImageId`.
- Each event's `imageUrl` from its `imageStorageId` (batched via `Promise.all`).
- Museum artifact image URL via the linked `museumScans` doc.

---

## 8. Engine Orchestration Module

Files: `convex/engine.ts`.

### `generateFromWhatIf`

Curated flow, single entry point used by the simulate page.

```ts
action({
  args: { incidentId, whatIfPrompt, originalTimelineId?, demo? },
  returns: { simulationId, usedDemoFallback? },
})
```

Steps:

1. `requireUserId`.
2. Validate `whatIfPrompt.length ≥ 5`.
3. `api.simulations.createDraft({ source: "curated", ... })`.
4. `api.simulations.setGenerating(...)`.
5. `api.actions.generatePhaseOne.run({ simulationId, demo })`.
6. Return `simulationId` (the client subscribes to `simulations.get`).

### `remixFromSimulation`

1. Load the original sim (auth-checked through `simulations.get`).
2. `api.remix.start({ originalSimulationId, newWhatIfPrompt, source })`.
3. Set status to `generating`.
4. Branch:
   - `source = "museum"` → run `generateTimelineFromDuration` with the original's `selectedDurationId`, plus async `fetchSimulationEventImages.fetchForSimulation`.
   - `source = "curated"` → `generatePhaseOne`.

---

## 9. Phase 1 / Phase 2 Generation Actions

### Phase 1 — `actions/generatePhaseOne.ts`

Prompt template (`phase1Schema`):

```
Return JSON: {
  "chaosScore": number 0-100,
  "immediateRipple": TimelineEvent[],
  "generationalShift": TimelineEvent[],
  "branchChoices": BranchChoice[]
}
```

System: `"You are an alternate-history engine. <schema>. Be specific to the incident and what-if."`

User payload assembled from `getGenerationContext`:

```
Incident (YEAR): TITLE
DESCRIPTION
Real outcome: REAL_OUTCOME
What if: WHAT_IF_PROMPT
```

Post-processing:

- Clamp `chaosScore` to `[0, 100]`.
- Run `normalizeTimelineEvents` on both event lists.
- Run `normalizeBranchChoices` on choices.
- Persist via `simulationsInternal.patchPhase1`.
- Record usage via `recordGroqUsage({ feature: "phase1" })`.

Failure modes:

| Branch                                  | Action                                                      |
|-----------------------------------------|-------------------------------------------------------------|
| `isDemoMode(args.demo)`                 | Apply `pickDemoPhase1` immediately. Return `{ ok }`.        |
| `isLlmRateLimitError(err)`              | Log, apply demo, return `{ ok, usedDemoFallback: true }`.   |
| Any other thrown error                  | Rethrow — the engine surfaces it to the UI.                 |

### Phase 2 — `actions/generatePhaseTwo.ts`

Same shape but the schema is:

```
{
  "globalConsequence": TimelineEvent[],
  "lostToHistory": string[],
  "gainedByHumanity": string[],
  "relicPrompt": string
}
```

The user payload adds the chosen branch (`selectedBranchTitle ?? selectedBranchId`) and prior `chaosScore`. The relic prompt is later consumed by `actions/generateRelicImage.ts` (best-effort; Groq has no image gen, so today this is a no-op placeholder per `groq.ts:generateRelicPng`).

---

## 10. Museum Scan Module

### Files

- `convex/museumScans.ts` (public) — `create`, `get`, `confirmExtracted`, `patchAnalyzed`.
- `convex/museumScansInternal.ts` — `getScanUrls`, `getScanOwnerUserId`, `patchAnalyzed` (internal write).
- `convex/actions/analyzeMuseumPhotos.ts` — vision call.
- `convex/actions/suggestTimeDurations.ts` — proposes duration options.
- `convex/actions/generateTimelineFromDuration.ts` — final timeline gen.

### Upload pipeline

1. Client requests a signed upload URL via `ctx.storage.generateUploadUrl()` from a mutation.
2. Browser `PUT`s file bytes directly to that URL.
3. Client calls `museumScans.create({ artifactImageId, labelImageId? })`.
4. Client calls `actions.analyzeMuseumPhotos.run({ scanId })`.
5. Vision result is patched onto the scan via `patchAnalyzed` (status → `analyzed`).
6. UI shows the extracted text; user can edit and submit `confirmExtracted` (status → `confirmed`).
7. UI calls `actions.suggestTimeDurations.run({ scanId })` → returns 4 duration options.
8. UI creates the museum-sourced `simulations.createDraft({ source: "museum", museumScanId })`.
9. UI persists chosen duration via `setMuseumDuration`, then triggers `generateTimelineFromDuration`.

### Vision prompt

Built dynamically depending on whether a label photo is present:

```
Analyze museum artifact and label photos. Return JSON {
  artifactName, artifactType, labelText, estimatedEra,
  historicalContext, confidence (0-1)
}
```

Image bytes are base64-encoded inside `groq.ts:imageUrlToDataPart`. The server resolves `SITE_URL`-relative storage URLs to absolute URLs before fetching.

---

## 11. Stabilize Game Module

### Files

- `convex/stabilization.ts` — `recordAttempt` mutation, queries for chaotic targets.
- `convex/actions/stabilizeTimeline.ts` — `startChallenge` + `submitFixes`.
- `convex/lib/constants.ts` — `CHAOS_WIN_THRESHOLD = 40`, `CHAOS_CHAOTIC_THRESHOLD = 75`.

### `startChallenge`

1. Load sim via `api.simulations.get`. Auth implicit (public sim or owner).
2. Validate `events.length > 0`.
3. Groq call: *"Return JSON with exactly 5 correctiveChoices: [...]"*.
4. `normalizeCorrectiveChoices` enforces string `id`s.
5. Return `{ correctiveChoices: [5] }`.

### `submitFixes`

1. Reload the sim.
2. In demo mode → use `demoStabilizeWin` fixture.
3. Otherwise: Groq call asking for `resultingChaosScore: number 0-100` given current chaos + selected fixes. Falls back to `chaos - 12 * selected.length` on NaN.
4. `patchChaos` persists the new score (and appends any demo `eventsPatch`).
5. `won = resultingChaosScore < CHAOS_WIN_THRESHOLD`.
6. Returns `{ resultingChaosScore, won }`.

### `stabilization.recordAttempt`

Logs the attempt and, on `won`, bumps `playerStats.stabilizeWins`.

---

## 12. Publishing & Remix Modules

### `convex/published.ts`

- `publish({ simulationId, title, description })` — owner-only. Trims inputs, sets `visibility = public`, `status = published`, calculates `isChaotic = chaosScore ≥ 75`. Idempotent (re-publish updates existing row).
- `getForSimulation` — used to render "View public link" CTA.
- `listPublic` — joins `publishedTimelines` with author + sim for the global dashboard.

### `convex/remix.ts`

- `start({ originalSimulationId, newWhatIfPrompt, source })` — creates a new draft with `remixOfSimulationId` set, inserts a row into `remixes`. Always called by the action layer, never directly from the UI.

### `convex/communityStats.ts`, `convex/platformStats.ts`

Aggregations powering the dashboard counters (total sims, chaotic sims, recent activity).

---

## 13. Image Enrichment Module

### Files

- `convex/actions/fetchIncidentImages.ts` — backfill cover/incident images.
- `convex/actions/fetchSimulationEventImages.ts` — per-event image fetcher (background).
- `convex/incidentImagesInternal.ts` — internal CRUD on the cache table.
- `convex/simulationImagesInternal.ts` — persist event imageStorageIds.
- `convex/lib/serper.ts` — minimal Serper Images client.
- `convex/lib/incidentImageKey.ts`, `eventImageKey.ts` — deterministic cache keys.
- `convex/lib/resolveIncidentImageUrl.ts` — `storageId ?? cachedUrl ?? fallback`.

### Cache flow

1. Compute deterministic `cacheKey` from incident title + year (or event title + year).
2. Query `incidentImageCache.by_cacheKey`. If hit → return its storageId.
3. Otherwise call Serper, download the first valid image, store via `ctx.storage.store()`, insert cache row.
4. Always increment `apiUsageEvents` with `provider="serper", feature="incident_image" | "simulation_event_image"`.

### Manual backfill

```bash
npm run fetch-incident-images
```

Runs `npx convex run actions/fetchIncidentImages:run --push` — useful before a demo.

---

## 14. Usage & Billing Module

### Files

- `convex/usage.ts` — public queries: `myUsage`, `globalBillingRates`.
- `convex/usageInternal.ts` — internal append/rollup mutations.
- `convex/lib/recordApiUsage.ts` — convenience helper used inside actions.
- `convex/lib/billingRates.ts` — model constants + USD calculators.

### Pricing constants

```
GROQ_TEXT_MODEL   = llama-3.3-70b-versatile  ($0.59 / $0.79 per 1M tokens)
GROQ_VISION_MODEL = llama-4-scout-17b-16e    ($0.11 / $0.34 per 1M tokens)
SERPER            = $0.001 per request
```

### Recording flow

```ts
await recordGroqUsage(ctx, {
  userId, feature, model,
  usage: { prompt_tokens, completion_tokens },
  simulationId?, museumScanId?,
});
```

This:

1. Inserts an `apiUsageEvents` row with `costUsd = groqCostUsd(...)`.
2. Patches the user's `userUsageTotals` row (or inserts one).

The `myUsage` query returns the rollup + recent events for the account page.

---

## 15. LLM Library (`lib/groq.ts`)

### Surface

```ts
generateJson<T>(system: string, user: string): Promise<{ data: T; usage; model }>
generateJsonWithImages<T>(system: string, parts: { text?; imageUrl? }[]): Promise<...>
```

Implementation notes:

- Single endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- Always uses `response_format: { type: "json_object" }` and `temperature: 0.4`.
- Vision calls fetch each image, sniff MIME from the response header, and base64-encode it into an `image_url` data URI.
- Errors are unwrapped from the OpenAI-compatible body (`{ error: { message, code, type } }`) and re-thrown with context.
- Rate limits are detectable via `isLlmRateLimitError` (checks status 429 / "rate_limit_exceeded" / "429 Too Many Requests").

### Why `generateRelicPng` returns `null`

Groq doesn't expose image generation today. The contract is preserved so a future provider swap (e.g. fal.ai, OpenAI Images) can drop in without changing call sites.

---

## 16. Demo Mode & Fixtures

### Activation

`isDemoMode(arg?)` returns true when **any** of:

- The query string contains `?demo=1` (passed through the action's `demo` arg).
- `process.env.DEMO_MODE === "true"`.

### Fixture sources

- `convex/seed/demoData.ts` — generic Phase 1 / Phase 2 / museum payloads.
- `convex/lib/demoFixtures.ts` — `pickDemoPhase1`, `pickDemoPhase2` return timeline-specific or incident-specific demo content (keyed by `timelineSlug`, `incidentTitle`, `incidentYear`).
- `convex/lib/demo.ts` — exposes `demoMuseum` (vision + durations + timeline) and `demoStabilizeWin`.

### Why deterministic fixtures?

A live demo has three failure surfaces (network, API quota, model variance). Fixtures make the chaos score, ledger, and relic prompt stable across runs — invaluable when the same scene gets practiced 20+ times.

---

## 17. Frontend Component Map

### Provider tree (`app/layout.tsx`)

```
<html>
  <body>
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>
        {children}
      </ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
    {production && <Analytics />}
  </body>
</html>
```

### Notable client components

| Component                                              | Role                                                                 |
|--------------------------------------------------------|----------------------------------------------------------------------|
| `components/simulate/simulate-page-client.tsx`         | What-if input + branch picker. Calls `engine.generateFromWhatIf` and `simulations.selectBranch`. |
| `components/simulation/simulation-viewer-client.tsx`   | Renders the generated timeline, ledger, relic, edit affordances.     |
| `components/simulation/story-cards.tsx`                | Animated phase 1 / phase 2 cards.                                    |
| `components/simulation/chaos-meter.tsx`                | Visual chaos score (Framer Motion).                                  |
| `components/simulation/ledger-split.tsx`               | Lost-to-history vs gained-by-humanity columns.                       |
| `components/simulation/editable-timeline-events.tsx`   | Inline editing → `simulations.updateEvents`.                         |
| `components/simulation/publish-dialog.tsx`             | Form → `published.publish`.                                          |
| `components/simulation/aurora-loading-screen.tsx`      | OGL-based loader while phase 1 generates.                            |
| `components/simulation/relic-image.tsx`                | Displays relic image (or fallback to prompt).                        |
| `components/simulation/remix-page-client.tsx`          | Remix form → `engine.remixFromSimulation`.                           |
| `components/stabilize/stabilize-game-client.tsx`       | Two-step minigame consuming the stabilize actions.                   |
| `components/dashboard/dashboard-page-client.tsx`       | `published.listPublic` feed.                                         |
| `components/timelines/*`                               | Curated timeline picker.                                             |
| `components/visuals/*`                                 | OGL + Three.js aurora background.                                    |
| `components/ui/*`                                      | shadcn primitives.                                                   |

### Shared hooks & libs (`frontend/lib/`, `frontend/hooks/`)

- `use-auth.ts` — wraps `useAuthActions` from Convex Auth.
- `use-toast.ts` — sonner adapter.
- `useDemoMode.ts` — reads `?demo=1` from search params.
- `share-simulation.ts` — Web Share API + clipboard fallback.
- `convex-ui.ts` — small UI mappers from Convex docs to view models.
- `mock-data.ts` — local fallbacks for fully-offline UI dev.

---

## 18. Error Handling & Edge Cases

| Case                                          | Where it's handled                                              |
|-----------------------------------------------|-----------------------------------------------------------------|
| Empty / short what-if prompt                  | `engine.generateFromWhatIf` (≥ 5 chars).                        |
| Anonymous user hitting protected mutation     | `requireUserId` throws `"Not authenticated"`.                   |
| Private sim viewed by stranger                | `simulations.get` returns `null`; UI renders 404.               |
| LLM JSON has wrong impactLevel type           | `normalizeTimelineEvents` coerces to allowed literal.           |
| LLM returns non-string ids                    | `normalizeBranchChoices` / `normalizeCorrectiveChoices` cast.   |
| Groq 429                                      | `isLlmRateLimitError` → demo fixture fallback.                  |
| Groq 5xx / other                              | Re-thrown with `code=` and `type=` for debugging.               |
| Empty/0-byte image fetched for vision         | `imageUrlToDataPart` throws explicit error.                     |
| Re-publishing same simulation                 | `published.publish` updates existing row instead of dup-insert. |
| Stabilize NaN score from LLM                  | Fallback formula `chaos - 12 * selected.length` (clamped 0–100).|

---

## 19. Testing Strategy

> Today the project relies on demo fixtures + manual QA; the structure below is the recommended (and partially-in-place) testing approach.

- **Unit (pure)**: `normalizeTimelineEvents`, `normalizeBranchChoices`, `normalizeCorrectiveChoices`, `groqCostUsd`, `isLlmRateLimitError`.
- **Convex tests** (`convex-test` package): `simulations.createDraft` → `setGenerating` → `patchPhase1` happy path with mocked actions.
- **Integration**: Run a full curated flow in demo mode (`?demo=1`) via Playwright; snapshot the rendered timeline.
- **Smoke (pre-demo)**: `DEMO.md` checklist + `npm run fetch-incident-images`.
- **LLM contract**: Replay recorded Groq responses (saved JSON) against the action handlers to catch schema drift.

Add new test files alongside the module they exercise.

---

## 20. Performance & Cost Notes

- **Phase 1 + Phase 2** ≈ 1.5k–3k input tokens, 0.7k–1.5k output tokens each. At Groq Llama 3.3 70B rates, well under $0.01 per full simulation.
- **Vision** call is cheaper per-token but image bytes inflate the prompt; keep artifact uploads ≤ 1024 px.
- **Storage URL signing** is per-call; the `simulations.get` query already batches via `Promise.all`. Avoid calling it per event in client loops — let the query return URLs.
- **Indexes used hot**: `simulations.by_user_updated` (inbox), `publishedTimelines.by_created` (feed), `incidentImageCache.by_cacheKey` (cache lookups). Add new indexes before adding new sort/filter combinations — never `filter()` on the hot path.

---

For higher-level rationale see [HIGH_LEVEL_DESIGN.md](HIGH_LEVEL_DESIGN.md). For "What if?" prompt examples used in QA see [TEST_PROMPTS.md](TEST_PROMPTS.md). For the live demo script see [../DEMO.md](../DEMO.md).
