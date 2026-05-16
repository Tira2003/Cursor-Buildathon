'use client'

import { useMutation, useQuery } from 'convex/react'
import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, Flame, GitBranch, Trophy } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { useConvexAuth } from 'convex/react'

export function ProfilePageClient() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.users.current)
  const stats = useQuery(api.users.getPlayerStats)
  const ensureStats = useMutation(api.users.ensurePlayerStats)

  useEffect(() => {
    if (isAuthenticated) {
      void ensureStats({})
    }
  }, [isAuthenticated, ensureStats])

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Community
          </Link>

          <h1 className="font-serif text-4xl font-bold text-foreground mb-2">Your profile</h1>
          <p className="text-muted-foreground mb-10">
            Track stabilize wins and chaotic timelines you have published.
          </p>

          {!isLoading && !isAuthenticated && (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <p className="text-muted-foreground mb-4">Sign in to view your historian stats.</p>
              <Link href="/signin">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Sign in
                </Button>
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <>
              <div className="rounded-lg border border-border bg-card p-6 mb-8">
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="font-medium text-lg text-foreground mt-1">
                  {me?.name ?? me?.email ?? 'Historian'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <StatBadge
                  icon={<Trophy className="w-6 h-6 text-chaos-green" />}
                  label="Stabilize wins"
                  value={stats?.stabilizeWins ?? 0}
                  hint="Chaos below 40"
                />
                <StatBadge
                  icon={<Flame className="w-6 h-6 text-chaos-amber" />}
                  label="Chaos published"
                  value={stats?.chaosPublished ?? 0}
                  hint="High-chaos timelines"
                />
                <StatBadge
                  icon={<GitBranch className="w-6 h-6 text-primary" />}
                  label="Simulations"
                  value={stats?.totalSimulations ?? 0}
                  hint="Total created"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/my-simulations">
                  <Button variant="outline">My simulations</Button>
                </Link>
                <Link href="/timelines">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Create timeline
                  </Button>
                </Link>
              </div>

              {(stats?.stabilizeWins ?? 0) > 0 && (
                <div className="mt-10 rounded-lg border border-chaos-green/30 bg-chaos-green/5 p-5 flex items-start gap-4">
                  <Award className="w-8 h-8 text-chaos-green shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Timeline stabilizer</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You have stabilized {stats?.stabilizeWins} chaotic timeline
                      {(stats?.stabilizeWins ?? 0) === 1 ? '' : 's'}.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function StatBadge({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  )
}
