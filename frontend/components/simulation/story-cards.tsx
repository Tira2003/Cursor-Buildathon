'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { HistoricalImage } from '@/components/ui/historical-image'
import { Button } from '@/components/ui/button'
import type { StoryCard } from '@/lib/types'

interface StoryCardsProps {
  cards: StoryCard[]
  onGenerateImage?: (cardId: string) => Promise<string>
}

export function StoryCards({ cards, onGenerateImage }: StoryCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [generatingCards, setGeneratingCards] = useState<Set<string>>(new Set())
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({})

  const currentCard = cards[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0))
  }

  const handleGenerateImage = async (cardId: string): Promise<string | undefined> => {
    if (generatingCards.has(cardId)) {
      return generatedImages[cardId] ?? cards.find((c) => c.id === cardId)?.image
    }

    setGeneratingCards((prev) => new Set([...prev, cardId]))

    try {
      if (onGenerateImage) {
        const url = await onGenerateImage(cardId)
        if (url) {
          setGeneratedImages((prev) => ({ ...prev, [cardId]: url }))
          return url
        }
        return undefined
      }

      await new Promise((resolve) => setTimeout(resolve, 3000))
      const card = cards.find((c) => c.id === cardId)
      if (card?.image) {
        setGeneratedImages((prev) => ({ ...prev, [cardId]: card.image! }))
        return card.image
      }
      return undefined
    } finally {
      setGeneratingCards((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    }
  }

  // Auto-trigger image generation for current card
  useEffect(() => {
    if (currentCard && !generatedImages[currentCard.id] && !generatingCards.has(currentCard.id)) {
      handleGenerateImage(currentCard.id)
    }
  }, [currentIndex])

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold text-foreground">
            The Alternate Timeline
          </h3>
          <p className="text-sm text-muted-foreground">
            Witness history unfold differently through {cards.length} pivotal moments
          </p>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="w-8 h-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
            {currentIndex + 1} / {cards.length}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="w-8 h-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Story Card */}
      <div className="relative">
        <StoryCardDisplay
          card={currentCard}
          isGenerating={generatingCards.has(currentCard.id)}
          generatedImage={generatedImages[currentCard.id]}
          onExpand={() => setExpandedCard(currentCard.id)}
          onRetry={async () => {
            await handleGenerateImage(currentCard.id)
          }}
          isMain
        />
      </div>

      {/* Timeline Strip */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-border -translate-y-1/2" />
        <div className="relative flex justify-between">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative z-10 flex flex-col items-center group ${
                index === currentIndex ? 'scale-110' : ''
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  index === currentIndex
                    ? 'bg-primary border-primary scale-125'
                    : index < currentIndex
                    ? 'bg-primary/50 border-primary/50'
                    : 'bg-card border-muted-foreground/30 group-hover:border-primary/50'
                }`}
              />
              <span
                className={`text-xs mt-2 transition-colors ${
                  index === currentIndex
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {card.year}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Thumbnail Strip */}
      <div className="grid grid-cols-5 gap-2">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => setCurrentIndex(index)}
            className={`relative aspect-video rounded-md overflow-hidden border-2 transition-all ${
              index === currentIndex
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-primary/50'
            }`}
          >
            {generatingCards.has(card.id) ? (
              <div className="absolute inset-0 bg-muted animate-shimmer z-10" />
            ) : null}
            <HistoricalImage
              src={generatedImages[card.id] ?? card.image}
              alt={card.title}
              className="absolute inset-0"
              imageClassName="object-cover"
              onRetry={() => handleGenerateImage(card.id)}
              retryLabel="Load image"
            />
            {index === currentIndex && (
              <div className="absolute inset-0 bg-primary/10" />
            )}
          </button>
        ))}
      </div>

      {/* Expanded View Modal */}
      {expandedCard && (
        <ExpandedStoryCard
          card={cards.find((c) => c.id === expandedCard)!}
          image={generatedImages[expandedCard]}
          onClose={() => setExpandedCard(null)}
        />
      )}
    </div>
  )
}

// Individual Story Card Display
function StoryCardDisplay({
  card,
  isGenerating,
  generatedImage,
  onExpand,
  onRetry,
  isMain,
}: {
  card: StoryCard
  isGenerating: boolean
  generatedImage?: string
  onExpand?: () => void
  onRetry?: () => Promise<void>
  isMain?: boolean
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card overflow-hidden ${
        isMain ? '' : ''
      }`}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/9] bg-muted overflow-hidden">
        {isGenerating ? (
          <ImageGeneratingAnimation prompt={card.imagePrompt} />
        ) : (
          <>
            <HistoricalImage
              src={generatedImage ?? card.image}
              alt={card.title}
              className="absolute inset-0"
              imageClassName="object-cover animate-fade-in-up"
              onRetry={onRetry}
              retryLabel="Load image"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none" />
            {onExpand && (
              <button
                onClick={onExpand}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <Expand className="w-4 h-4 text-foreground" />
              </button>
            )}
          </>
        )}

        {/* Year Badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              card.isAlternate
                ? 'bg-primary/90 text-primary-foreground'
                : 'bg-card/90 text-foreground'
            }`}
          >
            {card.isAlternate && <Sparkles className="w-3 h-3" />}
            {card.year}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h4 className="font-serif text-xl font-semibold text-foreground mb-2">
          {card.title}
        </h4>
        <p className="text-muted-foreground leading-relaxed">{card.description}</p>
      </div>
    </div>
  )
}

// Immersive image generation animation
function ImageGeneratingAnimation({ prompt }: { prompt: string }) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [typedText, setTypedText] = useState('')

  const phases = [
    'Analyzing historical context...',
    'Reconstructing alternate reality...',
    'Generating visual representation...',
    'Applying period-accurate aesthetics...',
    'Finalizing image...',
  ]

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setCurrentPhase((prev) => (prev < phases.length - 1 ? prev + 1 : prev))
    }, 2000)

    return () => clearInterval(phaseInterval)
  }, [])

  useEffect(() => {
    let index = 0
    const text = prompt.slice(0, 80) + (prompt.length > 80 ? '...' : '')
    setTypedText('')

    const typingInterval = setInterval(() => {
      if (index <= text.length) {
        setTypedText(text.slice(0, index))
        index++
      } else {
        clearInterval(typingInterval)
      }
    }, 30)

    return () => clearInterval(typingInterval)
  }, [prompt])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}

        {/* Scanning lines */}
        <div className="absolute inset-0">
          <div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            style={{
              animation: 'scan 2s ease-in-out infinite',
              top: '30%',
            }}
          />
          <div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            style={{
              animation: 'scan 2.5s ease-in-out infinite',
              animationDelay: '0.5s',
              top: '60%',
            }}
          />
        </div>

        {/* Corner decorations */}
        <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-primary/40" />
        <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-primary/40" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-primary/40" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-primary/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-md">
        {/* Spinning loader */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 border-2 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-primary rounded-full animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
        </div>

        {/* Phase indicator */}
        <p className="text-primary font-medium mb-2">{phases[currentPhase]}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1 mb-4">
          {phases.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= currentPhase ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Typed prompt preview */}
        <div className="bg-muted/50 rounded-lg p-3 min-h-[3rem]">
          <p className="text-xs text-muted-foreground italic">
            &ldquo;{typedText}
            <span className="animate-pulse">|</span>&rdquo;
          </p>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100px); }
        }
      `}</style>
    </div>
  )
}

// Expanded fullscreen view
function ExpandedStoryCard({
  card,
  image,
  onClose,
}: {
  card: StoryCard
  image?: string
  onClose: () => void
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in-up">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="max-w-5xl w-full mx-4">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Large Image */}
          <div className="relative aspect-[16/9]">
            <HistoricalImage
              src={image ?? card.image}
              alt={card.title}
              className="absolute inset-0"
              imageClassName="object-cover"
              retryLabel="Reload image"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

            {/* Year badge */}
            <div className="absolute bottom-6 left-6">
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium ${
                  card.isAlternate
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-foreground'
                }`}
              >
                {card.isAlternate && <Sparkles className="w-4 h-4" />}
                {card.year}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <h3 className="font-serif text-3xl font-bold text-foreground mb-4">
              {card.title}
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {card.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

