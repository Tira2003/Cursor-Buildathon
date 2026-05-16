'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import SoftAurora to avoid SSR issues with WebGL
const SoftAurora = dynamic(() => import('@/components/ui/soft-aurora'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-background" />
})

const phases = [
  'Analyzing divergence point...',
  'Calculating ripple effects...',
  'Generating timeline branches...',
  'Determining consequences...',
  'Rendering alternate reality...'
]

// Pre-computed stable particle positions to avoid hydration mismatches
const PARTICLE_POSITIONS = [
  { left: 12, top: 23, delay: 0.5, duration: 9 },
  { left: 87, top: 45, delay: 1.2, duration: 10 },
  { left: 34, top: 78, delay: 2.1, duration: 8 },
  { left: 56, top: 12, delay: 0.8, duration: 11 },
  { left: 91, top: 67, delay: 3.2, duration: 9 },
  { left: 23, top: 89, delay: 1.5, duration: 10 },
  { left: 67, top: 34, delay: 2.8, duration: 8 },
  { left: 45, top: 56, delay: 0.3, duration: 11 },
  { left: 78, top: 91, delay: 4.1, duration: 9 },
  { left: 8, top: 45, delay: 1.9, duration: 10 },
  { left: 95, top: 23, delay: 2.5, duration: 8 },
  { left: 42, top: 67, delay: 0.7, duration: 11 },
  { left: 63, top: 82, delay: 3.8, duration: 9 },
  { left: 17, top: 38, delay: 1.1, duration: 10 },
  { left: 89, top: 54, delay: 2.3, duration: 8 },
  { left: 31, top: 19, delay: 4.5, duration: 11 },
  { left: 74, top: 76, delay: 0.9, duration: 9 },
  { left: 52, top: 43, delay: 3.4, duration: 10 },
  { left: 6, top: 91, delay: 1.7, duration: 8 },
  { left: 83, top: 8, delay: 2.9, duration: 11 },
]

interface AuroraLoadingScreenProps {
  whatIfPrompt?: string
}

export function AuroraLoadingScreen({ whatIfPrompt }: AuroraLoadingScreenProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [displayedText, setDisplayedText] = useState('')

  // Cycle through phases
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % phases.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Typewriter effect for the current phase
  useEffect(() => {
    setDisplayedText('')
    const text = phases[currentPhase]
    let index = 0
    
    const typeInterval = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 40)

    return () => clearInterval(typeInterval)
  }, [currentPhase])

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0">
        <SoftAurora
          speed={0.4}
          scale={1.8}
          brightness={1.2}
          color1="#c9a227"
          color2="#8b6914"
          noiseFrequency={2.0}
          noiseAmplitude={1.2}
          bandHeight={0.5}
          bandSpread={1.5}
          octaveDecay={0.15}
          layerOffset={0.5}
          colorSpeed={0.8}
          enableMouseInteraction={true}
          mouseInfluence={0.3}
        />
      </div>

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
        {/* Main Title */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 tracking-tight">
            Your What-If Timeline
          </h1>
          <p className="text-2xl md:text-3xl text-primary font-serif">
            is Building
          </p>
        </div>

        {/* What-If Prompt Display */}
        {whatIfPrompt && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-surface/50 backdrop-blur-sm border border-primary/20 rounded-xl p-6">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">Your scenario</p>
              <p className="text-lg md:text-xl text-foreground/90 italic font-serif">
                &ldquo;{whatIfPrompt}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Phase Indicator */}
        <div className="flex flex-col items-center gap-6">
          {/* Current Phase Text */}
          <div className="h-8 flex items-center">
            <p className="text-lg md:text-xl text-primary/90 font-medium">
              {displayedText}
              <span className="animate-pulse">|</span>
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center gap-3">
            {phases.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  index === currentPhase
                    ? 'bg-primary w-8'
                    : index < currentPhase
                    ? 'bg-primary/60'
                    : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Floating Particles Effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLE_POSITIONS.map((particle, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-muted-foreground/60">
          Creating your alternate history...
        </p>
      </div>
    </div>
  )
}
