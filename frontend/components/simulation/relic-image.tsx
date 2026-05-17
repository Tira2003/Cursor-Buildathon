'use client'

import { Camera, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HistoricalImage } from '@/components/ui/historical-image'

interface RelicImageProps {
  imageUrl?: string
  prompt?: string
  altText?: string
  onRetry?: () => Promise<string | undefined | void>
}

export function RelicImage({
  imageUrl,
  prompt,
  altText = 'Historical relic from alternate timeline',
  onRetry,
}: RelicImageProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-foreground">Historical Relic</h3>
              <p className="text-xs text-muted-foreground">AI-generated artifact from this timeline</p>
            </div>
          </div>

          {imageUrl && (
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Download className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
        </div>
      </div>

      <div className="relative vintage-overlay aspect-video">
        <HistoricalImage
          src={imageUrl}
          alt={altText}
          className="absolute inset-0 sepia-[0.3] contrast-[1.1]"
          imageClassName="object-cover"
          onRetry={onRetry}
          retryLabel="Generate relic"
        />

        {imageUrl && (
          <>
            <div className="absolute inset-0 border-8 border-card/50 pointer-events-none z-10" />
            {prompt && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-card to-transparent p-4 pt-12 pointer-events-none z-10">
                <p className="text-sm text-foreground/90 italic">{prompt}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

