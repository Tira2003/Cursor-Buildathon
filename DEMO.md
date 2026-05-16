# AltEra — Judge demo script (~2 minutes)

**Roles:** Person D narrates · Person C drives UI  
**Pitch angle:** Sri Lankan kingdoms — Anuradhapura, Polonnaruwa, and Mahanuwara (Kandy). Golden curated path: **1815 — The Kandyan Convention.**

**Backup:** If live AI fails, use `?demo=1` or pre-seeded fixtures. Never tap untested paths on stage.

---

## Beat 1 — Museum (40s)

“At the museum, you photograph the artifact and its label. AltEra reads both and asks how far forward to simulate.”

1. Sign in (if required).
2. **Scan museum artifact** → use `public/demo-museum/` photos if live camera is risky.
3. Confirm extracted text → pick a duration (e.g. **75 years**).
4. Timeline appears → edit one event inline → Save.
5. Point at **chaos score**, **extinct**, and **born** lists.

---

## Beat 2 — Curated (40s)

“We are looking at **1815**. What if the **Kandyan Convention** was never signed? Let’s see how history rewires.”

1. **Browse historical timelines** → **Kandyan Kingdom (Mahanuwara)**.
2. Select **The Kandyan Convention, 1815**.
3. What if (one sentence), e.g.: *“What if the Kandyan chieftains refused to sign and rallied behind the King?”*
4. Phase 1 → pick a branch → phase 2 → story slides get web photos (Serper); relic shows as text caption only.
5. Show ledger: what goes **extinct**, what was **born**, **chaos ~78** (matches `demoSimulation.json`).
6. **Publish** to the feed.

---

## Beat 3 — Stabilize game (40s)

“Another historian broke this timeline. We stabilize it — pick corrective fixes until **chaos drops below 40**.”

1. Open **dashboard**.
2. Open a **high-chaos** published timeline (seed target: chaos **85+**, e.g. “The Convention Reversed”).
3. Tap **Stabilize timeline** → pick **2 corrective decisions**.
4. Chaos recalculates → e.g. **32** → **WIN** banner.
5. One line: *“You win when chaos is below 40 — not by restoring ‘real’ history, but by stabilizing the alternate timeline.”*

---

## Timing

| Beat | Target |
|------|--------|
| Museum | 40s |
| Curated (Kandyan Convention) | 40s |
| Stabilize | 40s |

---

## Environment (Convex)

- `GROQ_API_KEY` — all LLM text + museum vision (`npx convex env set GROQ_API_KEY …`)
- `SERPER_API_KEY` — per-event historical photos (`npx convex env set SERPER_API_KEY …`). Skipped when `?demo=1`.

**Museum flow API counts (live, typical):** ~1 Groq vision (analyze) + ~1 Groq text (durations) + ~1 Groq text (timeline) + ~1 Serper per timeline event. Shown on the simulation page as `apiUsage`.

### Avoiding API failures (Groq backend)

| Old Gemini pitfall | AltEra status |
|--------------------|---------------|
| Safety filters blocking WWI/WWII topics | **N/A** — we use Groq, not Gemini `safetySettings`. Prompts include educational alternate-history context. |
| 429 from React `useEffect` firing twice | **Mitigated** — museum analyze/durations use `useRef` guards; timeline/phase actions run on button click only. |
| API key in source / GitHub | **Avoided** — `GROQ_API_KEY` only in Convex env (`npx convex env set`), never in committed code. |
| 400 invalid JSON | **Mitigated** — `response_format: json_object` + explicit JSON field lists in prompts; parse errors logged with response snippet. |

On failure, check Convex action logs for `Groq API 429` (rate limit), `403` (key), or `400` (bad request).

---

## Pre-demo checklist

- [ ] Production URL loads; demo machine signed in
- [ ] `public/seed/` cover + incident images present (see `IMAGE_MANIFEST.md`)
- [ ] `public/demo-museum/artifact.jpg` + `label.jpg` tested once with vision
- [ ] At least one chaotic card (chaos ≥ 85) on dashboard
- [ ] 60s backup screen recording saved (hour 19–20)
