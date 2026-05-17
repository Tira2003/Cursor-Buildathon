'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useQuery } from 'convex/react'
import { ArrowLeft, Users, Sparkles, GitBranch, TrendingUp } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Header } from '@/components/layout/header'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

function chaosBadgeColor(score: number) {
  if (score >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
}

function formatCount(value: number | undefined): string {
  if (value === undefined) return '…'
  return value.toLocaleString()
}

function formatPublishedDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function CommunityPage() {
  const stats = useQuery(api.communityStats.get)
  const feed = useQuery(api.published.listPublic)

  const statCards = [
    { icon: GitBranch, label: 'Timelines', value: stats?.timelineCount },
    { icon: Users, label: 'Contributors', value: stats?.contributorCount },
    { icon: TrendingUp, label: 'Simulations', value: stats?.simulationCount },
  ]

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
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground">
                  Community
                </h1>
              </div>
              <p className="text-muted-foreground max-w-xl">
                Explore alternate timelines created by historians, curious minds, and chaos enthusiasts from around the world.
              </p>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4 mb-10">
              {statCards.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-4 text-center">
                  <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-xl font-bold text-foreground tabular-nums">
                    {formatCount(value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            {/* Timeline list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Trending this week
                </h2>
                {feed !== undefined && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {feed.length} published
                  </span>
                )}
              </div>

              {feed === undefined && (
                <p className="text-sm text-muted-foreground">Loading timelines…</p>
              )}

              {feed?.length === 0 && (
                <p className="text-sm text-muted-foreground rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-5">
                  No published timelines yet. Finish a simulation and publish it to appear here.
                </p>
              )}

              {feed?.map((item) => (
                <Link
                  key={item._id}
                  href={`/simulation/${item.simulationId}`}
                  className="block rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-5 hover:border-primary/40 hover:bg-black/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{item.authorName ?? 'Historian'}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{formatPublishedDate(item.createdAt)}</span>
                      </div>
                      <p className="font-medium text-foreground mb-1 line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${chaosBadgeColor(item.chaosScore)}`}>
                          Chaos {item.chaosScore}
                        </span>
                        {item.isChaotic && (
                          <span className="text-xs text-red-400/90">Unstable timeline</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
