'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, BookOpen, ChevronDown } from 'lucide-react'

const HERO_VIDEO = '/Landing.mp4'
const HERO_POSTER = '/images/hero/alternate-timelines.jpg'

export function Hero() {
  const [mounted, setMounted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setMounted(true)
    const video = videoRef.current
    if (!video) return
    void video.play().catch(() => {
      // Autoplay may be blocked until user interaction; poster still shows.
    })
  }, [])

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover object-center"
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-black/40" />

      {/* Gold glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {mounted && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[min(100%,36rem)] h-52 bg-primary/10 rounded-full blur-3xl" />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 w-full max-w-4xl mx-auto flex flex-col items-center pt-24 pb-20">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-xs text-white/80 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Alternate History Simulator
        </div>

        <h1 className={`font-serif text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 transition-all duration-700 delay-100 drop-shadow-lg ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="text-balance">Simulate the</span>
          <br />
          <span className="text-gradient-gold">Unseen</span>
        </h1>

        <p className={`text-lg md:text-xl text-white/75 max-w-xl mx-auto leading-relaxed mb-4 transition-all duration-700 delay-200 drop-shadow ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Change one moment. Rewrite everything.
        </p>
        <p className={`text-sm md:text-base text-white/50 max-w-lg mx-auto leading-relaxed mb-12 transition-all duration-700 delay-250 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Pick any turning point in history, ask &ldquo;what if&rdquo;, and watch AI rebuild the world that could have been.
        </p>

        <div className={`flex flex-col sm:flex-row items-center gap-6 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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

      {/* Scroll cue */}
      <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/30 transition-all duration-700 delay-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </div>
    </section>
  )
}
