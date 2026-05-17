'use client'

import { useAction, useConvexAuth, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Header } from '@/components/layout/header'
import { AuroraLoadingScreen } from '@/components/simulation/aurora-loading-screen'
import { incidentContextFromConvex } from '@/lib/convex-ui'
import { useDemoMode } from '@/lib/useDemoMode'

function generationErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('Not authenticated')) {
    return 'Sign in to generate alternate timelines. Your what-if will be kept in the URL after you log in.'
  }
  if (msg.includes('GROQ_API_KEY')) {
    return 'AI is not configured on this deployment. Try ?demo=1 in the URL for offline demo data.'
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'AI quota exceeded. Retry later or add ?demo=1 to the URL for demo fixtures.'
  }
  if (msg.includes('at least 5 characters')) {
    return 'Your what-if must be at least 5 characters.'
  }
  return `Generation failed: ${msg}`
}

interface SimulatePageClientProps {
  incidentId: string
}

export function SimulatePageClient({ incidentId }: SimulatePageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const demo = useDemoMode()
  const timelineIdParam = searchParams.get('timelineId')
  const whatIfParam = searchParams.get('whatIf') ?? ''

  const returnTo = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  const signInHref = `/signin?redirect=${encodeURIComponent(returnTo)}`
  const data = useQuery(api.incidents.get, {
    incidentId: incidentId as Id<'timelineIncidents'>,
  })
  const generate = useAction(api.engine.generateFromWhatIf)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const startedRef = useRef(false)

  const runGenerate = useCallback(
    async (prompt: string) => {
      if (!data) return
      setIsGenerating(true)
      setError(null)
      try {
        const { simulationId, usedDemoFallback } = await generate({
          incidentId: incidentId as Id<'timelineIncidents'>,
          originalTimelineId:
            (timelineIdParam as Id<'predefinedTimelines'> | null) ?? data.timeline._id,
          whatIfPrompt: prompt,
          demo,
        })
        const qs = demo || usedDemoFallback ? '?demo=1' : ''
        router.push(`/simulation/${simulationId}${qs}`)
      } catch (err) {
        setError(generationErrorMessage(err))
        setIsGenerating(false)
        startedRef.current = false
      }
    },
    [data, demo, generate, incidentId, router, timelineIdParam],
  )

  useEffect(() => {
    if (authLoading || !isAuthenticated) return
    if (data === undefined || data === null) return
    const prompt = whatIfParam.trim()
    if (!prompt) return
    if (startedRef.current) return
    startedRef.current = true
    void runGenerate(prompt)
  }, [authLoading, isAuthenticated, data, whatIfParam, runGenerate])

  if (data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading incident…</p>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-foreground mb-4">Incident Not Found</h1>
          <Link href="/timelines" className="text-primary hover:underline">
            Browse Timelines
          </Link>
        </div>
      </div>
    )
  }

  const { timeline, incident } = incidentContextFromConvex(data.timeline, data.incident)
  const prompt = whatIfParam.trim()

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 px-6">
          <div className="mx-auto max-w-2xl">
            <Link
              href="/timelines"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timelines
            </Link>

            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">
                Sign in to simulate
              </h1>
              <p className="text-muted-foreground mb-4">
                Generating alternate timelines requires an account.
              </p>
              <p className="text-sm text-muted-foreground/90 italic border-l-2 border-primary/40 pl-3">
                &ldquo;{prompt}&rdquo;
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={signInHref}
                className="flex-1 inline-flex justify-center items-center h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90"
              >
                Sign in
              </Link>
              <Link
                href={`/signup?redirect=${encodeURIComponent(returnTo)}`}
                className="flex-1 inline-flex justify-center items-center h-11 rounded-lg border border-border text-sm font-medium hover:bg-muted/50"
              >
                Create account
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!prompt) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 pb-16 px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-muted-foreground mb-6">
              Choose a moment and enter your what-if on the timelines page first.
            </p>
            <Link
              href="/timelines"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Timelines
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (isGenerating && !error) {
    return <AuroraLoadingScreen whatIfPrompt={prompt} />
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/timelines"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Timelines
          </Link>

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {incident.date}
              </span>
              <span className="text-xs text-muted-foreground">{timeline.title}</span>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-foreground mb-3">
              {incident.title}
            </h1>
            {incident.context && (
              <p className="text-muted-foreground leading-relaxed">{incident.context}</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <div className="flex flex-wrap gap-4">
                {!isAuthenticated && (
                  <Link
                    href={signInHref}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    Sign in
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    startedRef.current = true
                    void runGenerate(prompt)
                  }}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
