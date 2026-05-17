'use client'

import { useAction, useQuery } from 'convex/react'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shuffle, Send, Lightbulb, GitBranch } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { AuroraLoadingScreen } from '@/components/simulation/aurora-loading-screen'
import { incidentContextFromConvex, mapIncident } from '@/lib/convex-ui'
import { getExampleWhatIfs } from '@/lib/incident-prompts'
import { useDemoMode } from '@/lib/useDemoMode'

interface RemixPageClientProps {
  simulationId: string
}

function generationErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit')) {
    return 'API rate limit exceeded. Retry later, check Groq/Serper keys in Convex, or use ?demo=1 in the URL.'
  }
  if (msg.includes('Simulation context not found')) {
    return 'This timeline cannot be remixed yet. Try again after Convex redeploys, or start a new museum scan.'
  }
  return 'Remix generation failed. Try again or add ?demo=1 to the URL.'
}

export function RemixPageClient({ simulationId }: RemixPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const demo = useDemoMode()
  const parentWhatIf = searchParams.get('whatIf')

  const [whatIf, setWhatIf] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const simulation = useQuery(api.simulations.get, {
    simulationId: simulationId as Id<'simulations'>,
  })
  const incidentData = useQuery(
    api.incidents.get,
    simulation?.changedIncidentId
      ? { incidentId: simulation.changedIncidentId }
      : 'skip',
  )
  const remixGenerate = useAction(api.engine.remixFromSimulation)

  const maxLength = 200
  const remainingChars = maxLength - whatIf.length

  if (simulation === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading timeline…</p>
      </div>
    )
  }

  if (simulation === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-foreground mb-4">Timeline Not Found</h1>
          <Link href="/timelines" className="text-primary hover:underline">
            Browse Timelines
          </Link>
        </div>
      </div>
    )
  }

  const currentWhatIf = parentWhatIf || simulation.whatIfPrompt || ''
  const incidentCtx =
    incidentData?.incident && incidentData.timeline
      ? incidentContextFromConvex(incidentData.timeline, incidentData.incident)
      : null
  const incident = incidentData?.incident
    ? mapIncident(incidentData.incident, incidentData.timeline.slug)
    : null
  const remixExamples = incident ? getExampleWhatIfs(incident) : []

  const backHref = `/simulation/${simulationId}${
    currentWhatIf ? `?whatIf=${encodeURIComponent(currentWhatIf)}` : ''
  }${demo ? `${currentWhatIf ? '&' : '?'}demo=1` : ''}`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whatIf.trim() || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const { simulationId: newSimId, usedDemoFallback } = await remixGenerate({
        originalSimulationId: simulationId as Id<'simulations'>,
        whatIfPrompt: whatIf.trim(),
        demo,
      })
      const qs = demo || usedDemoFallback ? '?demo=1' : ''
      router.push(`/simulation/${newSimId}${qs}`)
    } catch (err) {
      setError(generationErrorMessage(err))
      setIsGenerating(false)
    }
  }

  if (isGenerating && !error) {
    return (
      <AuroraLoadingScreen
        whatIfPrompt={whatIf.trim()}
        title="Timeline Remix"
        subtitle="is Building"
        bottomHint="Branching your alternate history…"
      />
    )
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to timeline
          </Link>

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Remixing alternate timeline
                </p>
                <h1 className="font-serif text-xl font-semibold text-foreground">
                  {incidentCtx?.incident.title ??
                    simulation.museumArtifactName ??
                    'Your simulation'}
                </h1>
              </div>
            </div>

            {incidentCtx && (
              <p className="text-sm text-muted-foreground mb-4">
                {incidentCtx.timeline.title} &middot; {incidentCtx.incident.date}
              </p>
            )}

            <p className="text-sm text-muted-foreground mb-2">Current scenario</p>
            <blockquote className="font-serif text-lg text-foreground/90 border-l-2 border-primary pl-4">
              &ldquo;{currentWhatIf}&rdquo;
            </blockquote>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shuffle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-serif text-xl font-semibold text-foreground">
                  Prompt Remix
                </h2>
                <p className="text-sm text-muted-foreground">
                  Branch from this timeline with a new what-if
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <textarea
                  value={whatIf}
                  onChange={(e) => setWhatIf(e.target.value.slice(0, maxLength))}
                  placeholder="What if..."
                  className="w-full h-32 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  disabled={isGenerating}
                />
                <div
                  className={`absolute bottom-3 right-3 text-xs ${remainingChars < 20 ? 'text-destructive' : 'text-muted-foreground'}`}
                >
                  {remainingChars} characters remaining
                </div>
              </div>

              {remixExamples.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Remix ideas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {remixExamples.map((example, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setWhatIf(example)}
                        className="px-3 py-1.5 rounded-full border border-border bg-muted/50 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 mb-4">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={!whatIf.trim() || isGenerating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                <span className="flex items-center gap-2">
                  Generate Remix
                  <Send className="w-4 h-4" />
                </span>
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
