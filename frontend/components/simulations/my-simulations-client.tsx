'use client'

import { useQuery } from 'convex/react'
import Link from 'next/link'
import { ArrowLeft, GitBranch } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { mapConvexStatus } from '@/lib/convex-ui'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ChaosMeter } from '@/components/simulation/chaos-meter'
import { useConvexAuth } from 'convex/react'

function statusLabel(status: string, visibility: string) {
  if (visibility === 'public') return 'Published'
  const mapped = mapConvexStatus(status)
  switch (mapped) {
    case 'generating':
      return 'Generating'
    case 'phase1_complete':
      return 'Phase 1'
    case 'phase2_generating':
      return 'Phase 2'
    case 'generated':
      return 'Ready'
    case 'published':
      return 'Published'
    default:
      return status
  }
}

export function MySimulationsClient() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const sims = useQuery(api.simulations.listMine)

  return (
    <div className="min-h-screen">
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

          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
            My simulations
          </h1>
          <p className="text-muted-foreground mb-10">
            Timelines you have created — open any to continue editing or publish.
          </p>

          {!isLoading && !isAuthenticated && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-muted-foreground mb-4">Sign in to see your simulations.</p>
              <Link href="/signin">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Sign in
                </Button>
              </Link>
            </div>
          )}

          {isAuthenticated && sims === undefined && (
            <p className="text-muted-foreground">Loading…</p>
          )}

          {isAuthenticated && sims?.length === 0 && (
            <p className="text-muted-foreground">
              No simulations yet.{' '}
              <Link href="/timelines" className="text-primary hover:underline">
                Start from a timeline
              </Link>
              .
            </p>
          )}

          <ul className="space-y-4">
            {sims?.map((sim) => (
              <li key={sim._id}>
                <Link
                  href={`/simulation/${sim._id}`}
                  className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {statusLabel(sim.status, sim.visibility)}
                        </span>
                      </div>
                      <p className="font-medium text-foreground truncate">
                        {sim.whatIfPrompt
                          ? `"${sim.whatIfPrompt}"`
                          : 'Museum timeline draft'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated {new Date(sim.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {sim.chaosScore !== undefined && (
                      <ChaosMeter score={sim.chaosScore} size="sm" />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}
