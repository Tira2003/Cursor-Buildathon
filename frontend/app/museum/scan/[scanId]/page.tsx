'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useDemoMode } from '@/lib/useDemoMode'
import {
  AuroraLoadingScreen,
  MUSEUM_ANALYZE_PHASES,
  MUSEUM_GENERATE_PHASES,
} from '@/components/simulation/aurora-loading-screen'

export default function MuseumScanPage() {
  const params = useParams()
  const scanId = params.scanId as Id<'museumScans'>
  const scan = useQuery(api.museumScans.get, { scanId })
  const analyze = useAction(api.actions.analyzeMuseumPhotos.run)
  const durations = useAction(api.actions.suggestTimeDurations.run)
  const createDraft = useMutation(api.simulations.createDraft)
  const setDuration = useMutation(api.simulations.setMuseumDuration)
  const generateTimeline = useAction(api.actions.generateTimelineFromDuration.run)
  const generateRelicImage = useAction(api.actions.generateRelicImage.run)
  const fetchSimulationImages = useAction(
    api.actions.fetchSimulationEventImages.fetchForSimulation,
  )
  const router = useRouter()
  const demo = useDemoMode()
  const [durationOptions, setDurationOptions] = useState<
    { id: string; label: string; description: string }[] | null
  >(null)
  const [isGeneratingTimeline, setIsGeneratingTimeline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (scan?.status === 'uploaded') {
      void analyze({ scanId, demo }).catch((err) => {
        setError(err instanceof Error ? err.message : 'Artifact analysis failed')
      })
    }
  }, [scan?.status, scanId, analyze, demo])

  useEffect(() => {
    if (scan?.status === 'analyzed' && !durationOptions) {
      void durations({ scanId, demo })
        .then((r) => setDurationOptions(r.options))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load duration options')
        })
    }
  }, [scan?.status, scanId, durations, durationOptions, demo])

  const isAnalyzing =
    scan === undefined ||
    scan?.status === 'uploaded' ||
    (scan?.status === 'analyzed' && !durationOptions)

  async function pickDuration(option: {
    id: string
    label: string
    description: string
  }) {
    setIsGeneratingTimeline(true)
    setError(null)

    try {
      const simulationId = await createDraft({ source: 'museum', museumScanId: scanId })
      await setDuration({
        simulationId,
        selectedDurationId: option.id,
        selectedDurationLabel: option.label,
      })
      await generateTimeline({
        simulationId,
        durationId: option.id,
        durationDescription: option.description,
        demo,
      })
      void fetchSimulationImages({ simulationId })
      await generateRelicImage({ simulationId, demo })
      router.push(`/simulation/${simulationId}${demo ? '?demo=1' : ''}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate timeline')
      setIsGeneratingTimeline(false)
    }
  }

  if (isAnalyzing || isGeneratingTimeline) {
    return (
      <AuroraLoadingScreen
        whatIfPrompt={
          isGeneratingTimeline
            ? scan?.extractedArtifactName ?? 'Building your alternate timeline…'
            : 'Analyzing museum artifact…'
        }
        title={isGeneratingTimeline ? 'Alternate Timeline' : 'Museum Scan'}
        subtitle={isGeneratingTimeline ? 'is Building' : 'in Progress'}
        phases={isGeneratingTimeline ? MUSEUM_GENERATE_PHASES : MUSEUM_ANALYZE_PHASES}
        bottomHint={
          isGeneratingTimeline
            ? 'Generating timeline and relic photograph…'
            : 'Reading artifact and preparing options…'
        }
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-6 overflow-x-hidden">
        <div className="mx-auto max-w-2xl min-w-0 w-full">
          <Link
            href="/museum"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Upload
          </Link>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 mb-6">
              {error}
            </p>
          )}

          {scan && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6 min-w-0">
                <h1 className="font-serif text-2xl font-bold text-foreground mb-2 break-words">
                  {scan.extractedArtifactName ?? 'Analyzing artifact…'}
                </h1>
                {scan.extractedLabelText && (
                  <p className="text-muted-foreground break-words text-pretty leading-relaxed">
                    {scan.extractedLabelText}
                  </p>
                )}
              </div>

              {durationOptions && (
                <ul className="grid gap-3 w-full min-w-0">
                  {durationOptions.map((d) => (
                    <li key={d.id} className="min-w-0 w-full">
                      <Button
                        type="button"
                        variant="outline"
                        className="group w-full min-w-0 h-auto p-4 text-left flex flex-col items-start gap-1 whitespace-normal hover:bg-primary hover:border-primary"
                        onClick={() => pickDuration(d)}
                      >
                        <span className="font-medium w-full text-foreground group-hover:text-black">
                          {d.label}
                        </span>
                        <span className="text-sm text-muted-foreground w-full break-words text-pretty leading-relaxed group-hover:text-black/90">
                          {d.description}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
