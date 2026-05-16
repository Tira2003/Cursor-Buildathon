'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Shuffle, Send, Lightbulb, GitBranch } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { getIncidentById, getSimulationById } from '@/lib/mock-data'

interface RemixPageClientProps {
  simulationId: string
}

const remixExamples = [
  'What if the assassin succeeded on the second attempt?',
  'What if Austria declared war anyway, without the assassination?',
  'What if a secret alliance had been exposed before the motorcade?',
]

export function RemixPageClient({ simulationId }: RemixPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const parentWhatIf = searchParams.get('whatIf')

  const [whatIf, setWhatIf] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const simulation = getSimulationById(simulationId)
  const incidentData = simulation ? getIncidentById(simulation.incidentId) : undefined
  const currentWhatIf = parentWhatIf || simulation?.whatIf || ''

  const maxLength = 200
  const remainingChars = maxLength - whatIf.length

  if (!simulation) {
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

  const backHref = `/simulation/${simulationId}${
    currentWhatIf ? `?whatIf=${encodeURIComponent(currentWhatIf)}` : ''
  }`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whatIf.trim() || isGenerating) return

    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newSimId =
      simulation.incidentId === 'sarajevo-1914'
        ? 'demo-sarajevo-1'
        : simulation.incidentId === 'cuban-missile-crisis'
          ? 'demo-cuban-1'
          : `sim-${Date.now()}`

    const params = new URLSearchParams({
      whatIf: whatIf.trim(),
      remixedFrom: simulationId,
    })

    router.push(`/simulation/${newSimId}?${params.toString()}`)
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
                  {incidentData?.incident.title ?? 'Your simulation'}
                </h1>
              </div>
            </div>

            {incidentData && (
              <p className="text-sm text-muted-foreground mb-4">
                {incidentData.timeline.title} &middot; {incidentData.incident.date}
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

              <Button
                type="submit"
                disabled={!whatIf.trim() || isGenerating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Generating remix...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Generate Remix
                    <Send className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
