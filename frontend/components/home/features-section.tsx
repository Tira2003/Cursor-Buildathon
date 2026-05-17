'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Camera, Users, ArrowRight } from 'lucide-react'

const features = [
  {
    href: '/timelines',
    icon: BookOpen,
    badge: 'Core feature',
    title: 'Browse Historical Timelines',
    description:
      'Dive into curated eras — World Wars, Cold War, ancient empires. Each timeline surfaces the critical incidents where history hung by a thread.',
    cta: 'Explore timelines',
    accent: 'primary',
    spotColor: 'rgba(var(--primary-rgb, 180,140,60), 0.12)',
  },
  {
    href: '/museum',
    icon: Camera,
    badge: 'AI-powered',
    title: 'Scan Museum Artifacts',
    description:
      'Point your camera at any museum artifact or label. Our AI vision model identifies the object, dates it, and links it to the relevant historical timeline.',
    cta: 'Scan an artifact',
    accent: 'violet',
    spotColor: 'rgba(139, 92, 246, 0.12)',
  },
  {
    href: '/community',
    icon: Users,
    badge: 'Community',
    title: 'Explore Community Timelines',
    description:
      'Thousands of historians, students and curious minds have already rewritten history. Browse their alternate worlds and remix your own.',
    cta: 'View community',
    accent: 'emerald',
    spotColor: 'rgba(16, 185, 129, 0.12)',
  },
]

const accentClasses: Record<string, { border: string; badge: string; cta: string; iconBg: string; iconColor: string }> = {
  primary: {
    border: 'border-primary/25 hover:border-primary/50',
    badge: 'bg-primary/10 text-primary border-primary/20',
    cta: 'text-primary group-hover:text-primary/80',
    iconBg: 'bg-primary/10 border-primary/20',
    iconColor: 'text-primary',
  },
  violet: {
    border: 'border-violet-500/25 hover:border-violet-500/50',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    cta: 'text-violet-400 group-hover:text-violet-300',
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-400',
  },
  emerald: {
    border: 'border-emerald-500/25 hover:border-emerald-500/50',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cta: 'text-emerald-400 group-hover:text-emerald-300',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
}

export function FeaturesSection() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-28 px-6 bg-background">
      {/* Divider gradient from above */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <div className={`flex justify-center mb-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 uppercase tracking-widest">
            Features
          </span>
        </div>

        <h2 className={`font-serif text-4xl md:text-5xl font-bold text-white text-center mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Everything you need to<br className="hidden sm:block" /> bend time
        </h2>
        <p className={`text-white/45 text-center max-w-xl mx-auto mb-16 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          From ancient artifacts to Cold War standoffs — AltEra gives you the tools to explore every branch of the timeline.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const cls = accentClasses[f.accent]
            return (
              <Link
                key={f.href}
                href={f.href}
                className={`group relative overflow-hidden rounded-2xl border ${cls.border} bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 p-7 flex flex-col`}
                style={{
                  transitionDelay: `${150 + i * 100}ms`,
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(24px)',
                }}
              >
                {/* Radial glow */}
                <div
                  className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-60"
                  style={{ background: f.spotColor }}
                />

                {/* Badge */}
                <span className={`self-start text-xs px-2.5 py-0.5 rounded-full border font-medium mb-5 ${cls.badge}`}>
                  {f.badge}
                </span>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl border ${cls.iconBg} flex items-center justify-center mb-5`}>
                  <f.icon className={`w-5 h-5 ${cls.iconColor}`} />
                </div>

                <h3 className="font-serif text-xl font-semibold text-white mb-3">{f.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed flex-1">{f.description}</p>

                <div className={`flex items-center gap-1.5 mt-6 text-sm font-medium ${cls.cta} transition-colors`}>
                  {f.cta}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
