'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, GitBranch } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { ChaosMeter } from '@/components/simulation/chaos-meter'
import { mockUserSimulations } from '@/lib/mock-data'
import type { UserSimulationStatus } from '@/lib/types'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

function statusLabel(status: UserSimulationStatus): string {
  switch (status) {
    case 'phase1':
      return 'Phase 1'
    case 'ready':
      return 'Ready'
    case 'published':
      return 'Published'
    case 'generating':
      return 'Generating'
    default:
      return status
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MyTimelinesPage() {
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

          <div className="space-y-4">
            {mockUserSimulations.map((sim) => (
              <Link
                key={sim.id}
                href={`/simulation/${sim.id}`}
                className="block rounded-lg border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-medium uppercase tracking-wider text-primary">
                        {statusLabel(sim.status)}
                      </span>
                    </div>
                    <h2 className="font-serif text-lg md:text-xl text-foreground mb-2 line-clamp-2">
                      &ldquo;{sim.whatIf}&rdquo;
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Updated {formatDate(sim.updatedAt)}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <ChaosMeter score={sim.chaosScore} size="sm" animated={false} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {mockUserSimulations.length === 0 && (
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
        </div>
      </main>
      </div>
    </div>
  )
}
