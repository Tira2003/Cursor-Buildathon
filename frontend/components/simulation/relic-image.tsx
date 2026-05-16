'use client'

import { ScrollText } from 'lucide-react'

interface RelicImageProps {
  prompt?: string
}

/** Text-only museum artifact caption (no AI-generated image). */
export function RelicImage({ prompt }: RelicImageProps) {
  if (!prompt) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <ScrollText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-foreground">
              Museum artifact
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Imagined relic from this alternate timeline
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground italic">
              {prompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
