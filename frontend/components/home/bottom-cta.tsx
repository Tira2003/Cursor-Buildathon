'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { AnimatedStat } from './animated-stat'

const statLabels = [
  { key: 'timelineCount' as const, label: 'Historical eras', format: 'plus' as const },
  { key: 'incidentCount' as const, label: 'Critical incidents', format: 'plus' as const },
  { key: 'simulationCount' as const, label: 'Simulations run', format: 'compact' as const },
  { key: 'memberCount' as const, label: 'Community members', format: 'plain' as const },
]

export function BottomCTA() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const platformStats = useQuery(api.platformStats.get)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const animate = visible && platformStats !== undefined

  return (
    <section ref={ref} className="relative py-28 px-6 bg-background overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 w-[700px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto max-w-4xl relative z-10">
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {statLabels.map((s) => (
            <div key={s.label} className="text-center">
              {platformStats ? (
                <AnimatedStat
                  value={platformStats[s.key]}
                  animate={animate}
                  format={s.format}
                  className="font-serif text-4xl font-bold text-white mb-1 tabular-nums"
                />
              ) : (
                <p className="font-serif text-4xl font-bold text-white/30 mb-1 tabular-nums">—</p>
              )}
              <p className="text-xs text-white/40 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>

        <div
          className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="w-14 h-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>

          <h2 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
            Your turn to rewrite history
          </h2>
          <p className="text-white/50 max-w-md mx-auto mb-10 leading-relaxed">
            Sign up free and start your first simulation in under a minute. No historical expertise needed — just imagination.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/85 transition-colors"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/timelines"
              className="px-8 py-3.5 rounded-xl border border-white/15 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 font-medium text-sm transition-all"
            >
              Browse without signing up
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
