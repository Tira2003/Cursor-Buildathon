'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useQuery } from 'convex/react'
import { ArrowLeft, Users, Sparkles, GitBranch, TrendingUp } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Header } from '@/components/layout/header'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

const communityTimelines = [
  {
    id: 'c1',
    author: 'HistoryBuff_42',
    whatIf: 'What if the Cuban Missile Crisis escalated into full nuclear war?',
    timeline: 'Cold War',
    chaosScore: 94,
    likes: 312,
    updatedAt: '2026-05-14',
  },
  {
    id: 'c2',
    author: 'AltHistorian',
    whatIf: 'What if the Archduke survived the assassination attempt?',
    timeline: 'World War I',
    chaosScore: 61,
    likes: 189,
    updatedAt: '2026-05-12',
  },
  {
    id: 'c3',
    author: 'TimeTraveler99',
    whatIf: 'What if the Soviet Union won the Space Race?',
    timeline: 'Cold War',
    chaosScore: 48,
    likes: 145,
    updatedAt: '2026-05-10',
  },
  {
    id: 'c4',
    author: 'ChronoSage',
    whatIf: 'What if Napoleon won at Waterloo?',
    timeline: 'Napoleonic Wars',
    chaosScore: 79,
    likes: 267,
    updatedAt: '2026-05-08',
  },
  {
    id: 'c5',
    author: 'ParadoxEngine',
    whatIf: 'What if the Berlin Wall never fell?',
    timeline: 'Cold War',
    chaosScore: 55,
    likes: 201,
    updatedAt: '2026-05-06',
  },
]

function chaosBadgeColor(score: number) {
  if (score >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20'
  if (score >= 50) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
}

function formatCount(value: number | undefined): string {
  if (value === undefined) return '—'
  return value.toLocaleString()
}

export default function CommunityPage() {
  const stats = useQuery(api.communityStats.get)

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
              </div>

              {communityTimelines.map((item) => (
                <Link
                  key={item.id}
                  href={`/simulation/${item.id}`}
                  className="block rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-5 hover:border-primary/40 hover:bg-black/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{item.author}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{item.timeline}</span>
                      </div>
                      <p className="font-medium text-foreground mb-3 line-clamp-2">
                        &ldquo;{item.whatIf}&rdquo;
                      </p>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${chaosBadgeColor(item.chaosScore)}`}>
                          Chaos {item.chaosScore}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ♥ {item.likes} likes
                        </span>
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
