'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react'
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

export function MuseumScanClient() {
  const params = useParams()
  const scanId = params.scanId as Id<'museumScans'>
  const returnTo = `/museum/scan/${scanId}`

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
            New scan
          </Link>
          <RequireAuth returnTo={returnTo}>
            <MuseumScanFlow scanId={scanId} />
          </RequireAuth>
        </div>
      </main>
    </div>
  )
}

function MuseumScanFlow({ scanId }: { scanId: Id<'museumScans'> }) {
  const scan = useQuery(api.museumScans.get, { scanId })

  const analyze = useAction(api.actions.analyzeMuseumPhotos.run)
  const durations = useAction(api.actions.suggestTimeDurations.run)
  const confirmExtracted = useMutation(api.museumScans.confirmExtracted)
  const createDraft = useMutation(api.simulations.createDraft)
  const setDuration = useMutation(api.simulations.setMuseumDuration)
  const generateTimeline = useAction(api.actions.generateTimelineFromDuration.run)
  const router = useRouter()
  const demo = useDemoMode()

  const [artifactName, setArtifactName] = useState('')
  const [labelText, setLabelText] = useState('')
  const [era, setEra] = useState('')
  const [historicalContext, setHistoricalContext] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [pickingDuration, setPickingDuration] = useState(false)
  const [durationOptions, setDurationOptions] = useState<
    { id: string; label: string; description: string }[] | null
  >(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [durationError, setDurationError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [loadingDurations, setLoadingDurations] = useState(false)
  const analyzeStarted = useRef(false)
  const durationsStarted = useRef(false)

  useEffect(() => {
    analyzeStarted.current = false
    durationsStarted.current = false
  }, [scanId])

  const runAnalyze = () => {
    analyzeStarted.current = true
    setAnalyzeError(null)
    void analyze({ scanId, demo }).catch((err) => {
      analyzeStarted.current = false
      setAnalyzeError(llmErrorMessage(err))
    })
  }

  useEffect(() => {
    if (scan?.status !== 'uploaded' || analyzeStarted.current) return
    runAnalyze()
  }, [scan?.status, scanId, demo])

  useEffect(() => {
    if (!scan) return
    if (scan.status === 'analyzed' || scan.status === 'confirmed') {
      setArtifactName(scan.extractedArtifactName ?? '')
      setLabelText(scan.extractedLabelText ?? '')
      setEra(scan.extractedEra ?? '')
      setHistoricalContext(scan.historicalContext ?? '')
    }
  }, [scan])

  useEffect(() => {
    if (scan?.status !== 'confirmed' || durationOptions || durationsStarted.current) return
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
  }, [scan?.status, scanId, durations, durationOptions, demo])

  async function onConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!artifactName.trim() || !labelText.trim()) return
    setConfirming(true)
    try {
      await confirmExtracted({
        scanId,
        extractedArtifactName: artifactName.trim(),
        extractedLabelText: labelText.trim(),
        extractedEra: era.trim() || undefined,
        historicalContext: historicalContext.trim() || undefined,
      })
    } finally {
      setConfirming(false)
    }
  }

  async function pickDuration(id: string, label: string) {
    setPickingDuration(true)
    setTimelineError(null)
    try {
      const simulationId = await createDraft({ source: 'museum', museumScanId: scanId })
      await setDuration({ simulationId, selectedDurationId: id, selectedDurationLabel: label })
      await generateTimeline({ simulationId, durationId: id, demo })
      router.push(`/simulation/${simulationId}${demo ? '?demo=1' : ''}`)
    } catch (err) {
      setTimelineError(llmErrorMessage(err))
      setPickingDuration(false)
    }
  }

  const isAnalyzing = scan?.status === 'uploaded'
  const showConfirm = scan?.status === 'analyzed'
  const showDurations = scan?.status === 'confirmed' && durationOptions

  return (
    <>
      {scan?.artifactUrl && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={scan.artifactUrl}
              alt="Uploaded artifact"
              fill
              className="object-contain"
              unoptimized
            />
            <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs">
              Artifact
            </span>
          </div>
          {scan.labelUrl && scan.labelUrl !== scan.artifactUrl && (
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
              <Image
                src={scan.labelUrl}
                alt="Uploaded label"
                fill
                className="object-contain"
                unoptimized
              />
              <span className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs">
                Label
              </span>
            </div>
          )}
        </div>
      )}

      {!scan && <p className="text-muted-foreground">Loading scan…</p>}

      {isAnalyzing && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="font-medium text-foreground">Analyzing photos with Groq vision…</p>
          <p className="text-sm text-muted-foreground mt-2">
            Extracting artifact name, era, and label text
          </p>
          {analyzeError && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-destructive">{analyzeError}</p>
              <Button type="button" variant="outline" onClick={runAnalyze}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry analysis
              </Button>
            </div>
          )}
        </div>
      )}

      {showConfirm && (
        <div className="rounded-lg border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">
                Confirm extraction
              </h1>
              <p className="text-sm text-muted-foreground">
                Edit Groq&apos;s readout, then choose a timeline span
              </p>
            </div>
          </div>

          <form onSubmit={onConfirm} className="space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Artifact name
              <input
                value={artifactName}
                onChange={(e) => setArtifactName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Label text
              <textarea
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                rows={4}
                className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Estimated era (optional)
              <input
                value={era}
                onChange={(e) => setEra(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                placeholder="e.g. Viking Age, 9th century"
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Historical context (optional)
              <textarea
                value={historicalContext}
                onChange={(e) => setHistoricalContext(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Background the timeline generator will use"
              />
            </label>
            <Button
              type="submit"
              disabled={confirming}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {confirming ? (
                'Continuing…'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Confirm & choose duration
                </span>
              )}
            </Button>
          </form>
        </div>
      )}

      {pickingDuration && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="font-medium text-foreground">Generating alternate timeline…</p>
          <p className="text-sm text-muted-foreground mt-2">
            Groq writes events; Serper may attach historical images
          </p>
        </div>
      )}

      {showDurations && !pickingDuration && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-serif text-xl font-semibold text-foreground mb-1">
              {artifactName}
            </h2>
            <p className="text-sm text-muted-foreground">{labelText}</p>
            {era && <p className="text-xs text-muted-foreground mt-2">{era}</p>}
          </div>
          <p className="text-sm font-medium text-foreground">
            Choose a time span for your alternate timeline
          </p>
          {timelineError && (
            <p className="text-sm text-destructive">{timelineError}</p>
          )}
          <ul className="grid gap-3">
            {durationOptions.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  disabled={pickingDuration}
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

      {scan?.status === 'confirmed' && !durationOptions && loadingDurations && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Loading duration options…</p>
        </div>
      )}

      {scan?.status === 'confirmed' && !durationOptions && !loadingDurations && durationError && (
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
