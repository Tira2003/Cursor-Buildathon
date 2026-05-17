'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { HistoricalImage } from '@/components/ui/historical-image'
import { useQuery } from 'convex/react'
import { ArrowRight, Calendar } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { mapTimelineListItem } from '@/lib/convex-ui'

export function FeaturedTimelines() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const featured = useQuery(api.timelines.listFeatured, { limit: 3 })

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-28 px-6 bg-background overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-5xl relative z-10">
        <div className={`flex justify-center mb-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 uppercase tracking-widest">
            Featured timelines
          </span>
        </div>

        <h2 className={`font-serif text-4xl md:text-5xl font-bold text-white text-center mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Moments that changed everything
        </h2>
        <p className={`text-white/45 text-center max-w-lg mx-auto mb-16 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Start here — these are the turning points where a single decision reshaped the course of civilisation.
        </p>

        {featured === undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/5 aspect-[4/5] animate-pulse"
              />
            ))}
          </div>
        )}

        {featured && featured.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
            {featured.map((row, i) => {
              const timeline = mapTimelineListItem(row)
              return (
                <Link
                  key={timeline.slug}
                  href={`/timelines/${timeline.slug}`}
                  className="group relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/25 transition-all duration-300 aspect-[4/5] block"
                  style={{
                    transitionDelay: `${150 + i * 100}ms`,
                    opacity: visible ? 1 : 0,
                    transform: visible ? 'translateY(0)' : 'translateY(28px)',
                  }}
                >
                  <HistoricalImage
                    src={timeline.coverImage}
                    alt={timeline.title}
                    className="absolute inset-0"
                    imageClassName="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    retryLabel="Reload image"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-medium">{timeline.era}</span>
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-white mb-1 group-hover:text-primary/90 transition-colors">
                      {timeline.title}
                    </h3>
                    <p className="text-xs text-white/50 line-clamp-2 mb-3">
                      {timeline.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-white/40 group-hover:text-white/70 transition-colors">
                      <span>
                        {row.incidentCount} critical moment{row.incidentCount === 1 ? '' : 's'}
                      </span>
                      <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {featured && featured.length === 0 && (
          <p className="text-center text-white/45 mb-10">
            No timelines yet. Run the seed script to load historical eras.
          </p>
        )}

        <div className={`flex justify-center transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Link
            href="/timelines"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white/70 hover:text-white text-sm font-medium transition-all duration-200"
          >
            Browse all timelines
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
