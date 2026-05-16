'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { RequireAuth } from '@/components/auth/require-auth'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useDemoMode } from '@/lib/useDemoMode'

function llmErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit')) {
    return 'Groq rate limit hit. Wait a moment, retry, or add ?demo=1 for offline data.'
  }
  if (msg.includes('GROQ_API_KEY')) {
    return 'GROQ_API_KEY is not set on Convex. Run: npx convex env set GROQ_API_KEY …'
  }
  return msg || 'Request failed.'
}

export function MuseumRemixClient() {
  const params = useParams()
  const simulationId = params.simulationId as Id<'simulations'>
  const returnTo = `/museum/remix/${simulationId}`

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/museum"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <RequireAuth returnTo={returnTo}>
            <MuseumRemixFlow simulationId={simulationId} />
          </RequireAuth>
        </div>
      </main>
    </div>
  )
}

function MuseumRemixFlow({ simulationId }: { simulationId: Id<'simulations'> }) {
  const sim = useQuery(api.simulations.get, { simulationId })
  const scan = useQuery(api.museumScans.getLinkedToSimulation, { simulationId })
  const durations = useAction(api.actions.suggestTimeDurations.run)
  const setDuration = useMutation(api.simulations.setMuseumDuration)
  const generateTimeline = useAction(api.actions.generateTimelineFromDuration.run)
  const router = useRouter()
  const demo = useDemoMode()

  const [durationOptions, setDurationOptions] = useState<
    { id: string; label: string; description: string }[] | null
  >(null)
  const [loadingDurations, setLoadingDurations] = useState(false)
  const [durationError, setDurationError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const durationsStarted = useRef(false)

  const scanId = sim?.museumScanId

  useEffect(() => {
    durationsStarted.current = false
    setDurationOptions(null)
  }, [simulationId])

  useEffect(() => {
    if (!scanId || durationOptions || durationsStarted.current) return
    if (sim?.source !== 'museum' || !sim.remixOfSimulationId) return

    durationsStarted.current = true
    setLoadingDurations(true)
    setDurationError(null)
    void durations({ scanId, demo })
      .then((r) => setDurationOptions(r.options))
      .catch((err) => {
        durationsStarted.current = false
        setDurationError(llmErrorMessage(err))
      })
      .finally(() => setLoadingDurations(false))
  }, [scanId, sim?.source, sim?.remixOfSimulationId, durations, durationOptions, demo])

  async function pickDuration(id: string, label: string) {
    setGenerating(true)
    setTimelineError(null)
    try {
      await setDuration({ simulationId, selectedDurationId: id, selectedDurationLabel: label })
      await generateTimeline({ simulationId, durationId: id, demo })
      router.push(`/simulation/${simulationId}${demo ? '?demo=1' : ''}`)
    } catch (err) {
      setTimelineError(llmErrorMessage(err))
      setGenerating(false)
    }
  }

  if (sim === undefined || scan === undefined) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
      </div>
    )
  }

  if (sim === null || scan === null || sim.source !== 'museum' || !sim.museumScanId) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">Remix draft not found or not a museum remix.</p>
        <Link href="/museum" className="text-sm text-primary hover:underline mt-4 block">
          Go to museum
        </Link>
      </div>
    )
  }

  const artifactName = scan.extractedArtifactName ?? 'Museum artifact'
  const labelText = scan.extractedLabelText ?? ''

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-foreground">Remix This Timeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a new time span. Photos from this artifact scan are reused when possible.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 mb-6">
        <div className="flex gap-4">
          {scan.artifactUrl && (
            <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
              <Image src={scan.artifactUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          )}
          <div>
            <h2 className="font-serif text-xl font-semibold text-foreground">{artifactName}</h2>
            {labelText && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{labelText}</p>
            )}
            {scan.extractedEra && (
              <p className="text-xs text-muted-foreground mt-2">{scan.extractedEra}</p>
            )}
          </div>
        </div>
      </div>

      {generating && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="font-medium text-foreground">Generating remix timeline…</p>
          <p className="text-sm text-muted-foreground mt-2">
            Groq writes events; cached and parent images skip Serper when possible
          </p>
        </div>
      )}

      {!generating && durationOptions && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Choose a time span</p>
          {timelineError && <p className="text-sm text-destructive">{timelineError}</p>}
          <ul className="grid gap-3">
            {durationOptions.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={generating}
                  onClick={() => pickDuration(d.id, d.label)}
                  className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 disabled:opacity-50"
                >
                  <p className="font-medium text-foreground">{d.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{d.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!generating && !durationOptions && loadingDurations && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading duration options…</p>
        </div>
      )}

      {!generating && !durationOptions && !loadingDurations && durationError && (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
          <p className="text-sm text-destructive">{durationError}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              durationsStarted.current = false
              setDurationError(null)
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry durations
          </Button>
        </div>
      )}
    </>
  )
}
