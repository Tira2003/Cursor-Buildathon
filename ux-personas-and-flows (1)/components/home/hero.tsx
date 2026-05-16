'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, BookOpen } from 'lucide-react'

const HERO_IMAGE = '/images/hero/alternate-timelines.jpg'

export function Hero() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative w-full min-h-[min(90vh,760px)] flex items-center justify-center overflow-hidden mb-0">
      {/* Background image */}
      <Image
        src={HERO_IMAGE}
        alt="Roman legions facing modern soldiers across an alternate timeline battlefield"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Lighter overlay — image should show through clearly */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/70 to-black/50" />

      {/* Subtle gold glow blob */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[min(100%,32rem)] h-48 bg-primary/8 rounded-full blur-3xl" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 w-full max-w-4xl mx-auto flex flex-col items-center pt-24 pb-16">
        {/* Tagline pill */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-xs text-white/80 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Alternate History Simulator
        </div>

        {/* Headline */}
        <h1
          className={`font-serif text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 transition-all duration-700 delay-100 drop-shadow-lg ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <span className="text-balance">Simulate the</span>
          <br />
          <span className="text-gradient-gold">Unseen</span>
        </h1>

        {/* Sub-headline */}
        <p
          className={`text-lg md:text-xl text-white/75 max-w-xl mx-auto leading-relaxed mb-12 transition-all duration-700 delay-200 drop-shadow ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          Change one moment. Rewrite everything.
          <br className="hidden sm:block" />
          <span className="text-white/90">Explore what could have been.</span>
        </p>

        {/* Cross-cut CTA buttons */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-6 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <Link href="/museum" className="hero-btn">
            <Camera className="w-4 h-4 shrink-0" style={{ position: 'relative', zIndex: 3 }} />
            <span>SCAN ARTIFACT</span>
          </Link>

          <Link href="/timelines" className="hero-btn">
            <BookOpen className="w-4 h-4 shrink-0" style={{ position: 'relative', zIndex: 3 }} />
            <span>BROWSE TIMELINES</span>
          </Link>
        </div>
      </div>
    </section>
  )
}
