'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Header } from '@/components/layout/header'
import { ExpandableTimelineCard } from '@/components/timelines/expandable-timeline-card'
import { mapTimelineDetail, mapTimelineListItem } from '@/lib/convex-ui'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

export function TimelinesPageClient() {
  const timelines = useQuery(api.timelines.list)
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const detail = useQuery(
    api.timelines.getBySlug,
    expandedSlug ? { slug: expandedSlug } : 'skip',
  )

  return (
    <div className="relative min-h-screen bg-background">
      {/* PixelBlast background — fixed, fills the whole viewport */}
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

      {/* Dark overlay so the content stays readable */}
      <div className="fixed inset-0 z-0 bg-background/60 pointer-events-none" />

      {/* Page content sits above the background */}
      <div className="relative z-10">
        <Header />

        <main className="pt-24 pb-16 px-6">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            <div className="mb-12">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
                Historical Timelines
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Browse pivotal moments in history. Expand any era, select a critical incident, and ask &ldquo;what if&rdquo; to explore alternate realities.
              </p>
            </div>

            {timelines === undefined && (
              <p className="text-muted-foreground">Loading timelines…</p>
            )}

            <div className="space-y-6">
              {timelines?.map((t, index) => {
                const base = mapTimelineListItem(t)
                const timeline =
                  expandedSlug === t.slug && detail
                    ? mapTimelineDetail(detail.timeline, detail.incidents)
                    : { ...base, incidents: [] }

                return (
                  <ExpandableTimelineCard
                    key={t.slug}
                    timeline={timeline}
                    timelineDbId={t._id}
                    incidentCount={t.incidentCount}
                    index={index}
                    isExpanded={expandedSlug === t.slug}
                    onToggle={() =>
                      setExpandedSlug((s) => (s === t.slug ? null : t.slug))
                    }
                  />
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
