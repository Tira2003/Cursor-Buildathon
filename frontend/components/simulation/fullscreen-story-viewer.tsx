'use client'

import { useAction } from 'convex/react'
import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, Sparkles, Share2, Bookmark, Shuffle } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { HistoricalImage } from '@/components/ui/historical-image'
import type { StoryCard } from '@/lib/types'

interface FullscreenStoryViewerProps {
  cards: StoryCard[]
  whatIf: string
  onScrollToDetails: () => void
  onShare?: () => void
  onSave?: () => void
  onRemix?: () => void
}

export function FullscreenStoryViewer({ 
  cards, 
  whatIf, 
  onScrollToDetails,
  onShare,
  onSave,
  onRemix 
}: FullscreenStoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fetchEventImage = useAction(api.actions.fetchSimulationEventImages.fetchOne)

  const currentCard = cards[currentIndex]

  async function retryEventImage(card: StoryCard): Promise<string | undefined> {
    if (card.simulationId === undefined || card.eventIndex === undefined) {
      return undefined
    }
    const result = await fetchEventImage({
      simulationId: card.simulationId as Id<'simulations'>,
      eventIndex: card.eventIndex,
      force: true,
    })
    return result.ok ? result.imageUrl : undefined
  }
  const showDescription = isHovering

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const touchEnd = e.touches[0].clientX
    const diff = touchStart - touchEnd

    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      }
      setTouchStart(null)
    }
  }

  const handleTouchEnd = () => {
    setTouchStart(null)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else if (e.key === 'ArrowDown') {
        onScrollToDetails()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, cards.length, onScrollToDetails])

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
  }

  const goToNext = () => {
    if (currentIndex < cards.length - 1) setCurrentIndex(prev => prev + 1)
  }

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen bg-background overflow-hidden"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fullscreen Image - Show directly without animation */}
      <div className="absolute inset-0">
        <HistoricalImage
          src={currentCard.image}
          alt={currentCard.title}
          className="absolute inset-0"
          imageClassName="object-cover transition-opacity duration-500"
          priority
          retryLabel="Find historical photo"
          onRetry={
            currentCard.simulationId !== undefined &&
            currentCard.eventIndex !== undefined
              ? () => retryEventImage(currentCard)
              : undefined
          }
        />
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Top Bar - What-If Question + Frosted Action Buttons */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">Alternate Timeline</p>
            <h1 className="font-serif text-lg md:text-xl text-foreground/90 max-w-2xl">
              &ldquo;{whatIf}&rdquo;
            </h1>
          </div>

          {/* Frosted Action Buttons - Top Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-card/60 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/80 transition-all hover:scale-105 active:scale-95"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Share</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-card/60 backdrop-blur-md border border-border/50 text-foreground hover:bg-card/80 transition-all hover:scale-105 active:scale-95"
            >
              <Bookmark className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Save</span>
            </button>
            <button
              onClick={onRemix}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary/80 backdrop-blur-md border border-primary/50 text-primary-foreground hover:bg-primary transition-all hover:scale-105 active:scale-95"
            >
              <Shuffle className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Remix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Larger */}
      <button
        onClick={goToPrevious}
        disabled={currentIndex === 0}
        className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 md:w-16 md:h-16 rounded-full bg-card/60 backdrop-blur-md border border-border/50 flex items-center justify-center transition-all ${
          currentIndex === 0 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-card/80 hover:scale-110 active:scale-95'
        }`}
      >
        <ChevronLeft className="w-7 h-7 md:w-8 md:h-8" />
      </button>

      <button
        onClick={goToNext}
        disabled={currentIndex === cards.length - 1}
        className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 md:w-16 md:h-16 rounded-full bg-card/60 backdrop-blur-md border border-border/50 flex items-center justify-center transition-all ${
          currentIndex === cards.length - 1 
            ? 'opacity-30 cursor-not-allowed' 
            : 'hover:bg-card/80 hover:scale-110 active:scale-95'
        }`}
      >
        <ChevronRight className="w-7 h-7 md:w-8 md:h-8" />
      </button>

      {/* Story Description - Frosted card on image hover */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-all duration-500 ${
          showDescription
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8 pointer-events-none'
        }`}
      >
        <div className="px-6 md:px-12 pb-32">
          <div className="max-w-3xl mx-auto">
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50 p-6 md:p-8">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4 ${
                currentCard.isAlternate
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'bg-surface/90 text-foreground border border-border'
              }`}>
                {currentCard.isAlternate && <Sparkles className="w-4 h-4" />}
                {currentCard.year}
              </div>

              <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-3">
                {currentCard.title}
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                {currentCard.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Dots - Larger */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => setCurrentIndex(index)}
            className={`transition-all duration-300 ${
              index === currentIndex
                ? 'w-10 h-3 bg-primary rounded-full'
                : 'w-3 h-3 bg-foreground/30 rounded-full hover:bg-foreground/50'
            }`}
          />
        ))}
      </div>

      {/* Scroll Down Indicator */}
      <button
        onClick={onScrollToDetails}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors animate-bounce"
      >
        <span className="text-sm font-medium uppercase tracking-wider">Explore Details</span>
        <ChevronDown className="w-6 h-6" />
      </button>

    </div>
  )
}
