'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, Zap, GitBranch } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Pick a Turning Point',
    description:
      'Browse curated historical timelines — from World War I to the Cold War. Find a critical moment that shaped the world.',
    color: 'from-primary/20 to-primary/5',
    border: 'border-primary/30',
    iconColor: 'text-primary',
  },
  {
    number: '02',
    icon: Zap,
    title: 'Ask "What If?"',
    description:
      'Type your alternate scenario. What if the assassin missed? What if the treaty was signed? The AI takes it from there.',
    color: 'from-violet-500/20 to-violet-500/5',
    border: 'border-violet-500/30',
    iconColor: 'text-violet-400',
  },
  {
    number: '03',
    icon: GitBranch,
    title: 'Watch History Rewrite',
    description:
      'AltEra simulates a full alternate timeline — scoring chaos, tracing ripple effects, and revealing a world that never was.',
    color: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
]

export function HowItWorks() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-28 px-6 bg-background overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="mx-auto max-w-5xl relative z-10">
        {/* Label */}
        <div className={`flex justify-center mb-4 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 uppercase tracking-widest">
            How it works
          </span>
        </div>

        <h2 className={`font-serif text-4xl md:text-5xl font-bold text-white text-center mb-4 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          Three steps to rewrite history
        </h2>
        <p className={`text-white/45 text-center max-w-xl mx-auto mb-16 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          No PhD required. Just curiosity about what could have been.
        </p>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative overflow-hidden rounded-2xl border ${step.border} bg-gradient-to-b ${step.color} p-7 transition-all duration-700`}
              style={{ transitionDelay: `${200 + i * 120}ms`, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)' }}
            >
              {/* Step number watermark */}
              <span className="absolute top-4 right-5 font-serif text-6xl font-bold text-white/5 select-none leading-none">
                {step.number}
              </span>

              <div className={`w-11 h-11 rounded-xl border ${step.border} bg-background/60 flex items-center justify-center mb-5`}>
                <step.icon className={`w-5 h-5 ${step.iconColor}`} />
              </div>

              <h3 className="font-serif text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{step.description}</p>

              {/* Connector arrow (hidden on last) */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background border border-white/10 items-center justify-center z-10">
                  <span className="text-white/30 text-xs">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
