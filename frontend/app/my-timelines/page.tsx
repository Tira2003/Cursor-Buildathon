'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, GitBranch } from 'lucide-react'
import { useQuery } from 'convex/react'
import { Header } from '@/components/layout/header'
import { ChaosMeter } from '@/components/simulation/chaos-meter'
import { useAuth } from '@/lib/use-auth'
import { api } from '@/convex/_generated/api'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

function statusLabel(status: string): string {
  switch (status) {
    case 'phase1_complete':
      return 'Phase 1'
    case 'editable':
      return 'Ready'
    case 'published':
      return 'Published'
    case 'generating':
    case 'phase2_generating':
      return 'Generating'
    case 'saved':
      return 'Saved'
    case 'draft':
      return 'Draft'
    default:
      return status
  }
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MyTimelinesPage() {
  const { loggedIn, mounted } = useAuth()
  const sims = useQuery(api.simulations.listMine, loggedIn ? {} : 'skip')

  return (
    <div className="relative min-h-screen bg-background">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="circle"
          pixelSize={4}
          color="#7c3aed"
          patternScale={3}
          patternDensity={0.85}
          enableRipples={true}
          rippleSpeed={0.35}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          edgeFade={0.18}
          speed={0.4}
          transparent={true}
          pixelSizeJitter={0.4}
        />
      </div>
      <div className="fixed inset-0 z-0 bg-background/60 pointer-events-none" />

      <div className="relative z-10">
        <Header />

        <main className="pt-24 pb-16 px-6">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Profile
            </Link>

            <div className="mb-10">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">
                My simulations
              </h1>
              <p className="text-muted-foreground">
                Timelines you have created — open any to continue editing or publish.
              </p>
            </div>

            {mounted && !loggedIn && (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Sign in to see your simulations.
                </p>
                <Link
                  href="/signin?redirect=/my-timelines"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Sign in
                </Link>
              </div>
            )}

            {loggedIn && sims === undefined && (
              <p className="text-sm text-muted-foreground">Loading your simulations…</p>
            )}

            {loggedIn && sims && sims.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground mb-4">No alternate timelines yet.</p>
                <Link
                  href="/timelines"
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Create your first timeline
                </Link>
              </div>
            )}

            {loggedIn && sims && sims.length > 0 && (
              <div className="space-y-4">
                {sims.map((sim) => (
                  <Link
                    key={sim._id}
                    href={`/simulation/${sim._id}`}
                    className="block rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <GitBranch className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-medium uppercase tracking-wider text-primary">
                            {statusLabel(sim.status)}
                          </span>
                          {sim.visibility === 'public' && (
                            <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                              Public
                            </span>
                          )}
                        </div>
                        <h2 className="font-serif text-lg md:text-xl text-foreground mb-2 line-clamp-2">
                          {sim.whatIfPrompt
                            ? `“${sim.whatIfPrompt}”`
                            : sim.museumArtifactName
                              ? `Museum: ${sim.museumArtifactName}`
                              : 'Alternate timeline'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Updated {formatDate(sim.updatedAt)}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <ChaosMeter
                          score={sim.chaosScore ?? 0}
                          size="sm"
                          animated={false}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
