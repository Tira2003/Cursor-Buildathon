'use client'

import { useAction } from 'convex/react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { ImageIcon, Loader2, RefreshCw } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'

type HistoricalImageProps = {
  src?: string
  alt: string
  className?: string
  imageClassName?: string
  fill?: boolean
  sizes?: string
  priority?: boolean
  /** Fetch a historical photo via Serper for this incident */
  incidentId?: Id<'timelineIncidents'>
  /** Custom retry (e.g. regenerate story image) */
  onRetry?: () => Promise<string | undefined | void>
  retryLabel?: string
}

export function HistoricalImage({
  src,
  alt,
  className,
  imageClassName,
  fill = true,
  sizes,
  priority,
  incidentId,
  onRetry,
  retryLabel = 'Get photo',
}: HistoricalImageProps) {
  const fetchOne = useAction(api.actions.fetchIncidentImages.fetchOne)
  const [failed, setFailed] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [localSrc, setLocalSrc] = useState<string | undefined>()
  const [cacheBust, setCacheBust] = useState(0)

  const baseSrc = localSrc ?? src
  const displaySrc =
    baseSrc && cacheBust > 0
      ? `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}v=${cacheBust}`
      : baseSrc

  useEffect(() => {
    setFailed(false)
    setLocalSrc(undefined)
    setCacheBust(0)
  }, [src])

  const canRetry = Boolean(incidentId || onRetry || src)

  const handleRetry = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!canRetry || fetching) return

      setFetching(true)
      setFailed(false)

      try {
        if (onRetry) {
          const next = await onRetry()
          if (typeof next === 'string' && next) {
            setLocalSrc(next)
          } else if (src || localSrc) {
            setCacheBust((n) => n + 1)
          } else {
            setFailed(true)
          }
          return
        }

        if (incidentId) {
          const result = await fetchOne({ incidentId, force: true })
          if (result.ok && result.imageUrl) {
            setLocalSrc(result.imageUrl)
          } else {
            setFailed(true)
          }
          return
        }

        if (src) {
          setCacheBust((n) => n + 1)
        }
      } catch {
        setFailed(true)
      } finally {
        setFetching(false)
      }
    },
    [canRetry, fetching, fetchOne, incidentId, localSrc, onRetry, src],
  )

  const showPlaceholder = !displaySrc || failed

  if (showPlaceholder) {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center bg-muted overflow-hidden',
          className,
        )}
      >
        {fetching ? (
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        ) : canRetry ? (
          <button
            type="button"
            onClick={handleRetry}
            className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg border border-border/80 bg-background/60 hover:bg-background hover:border-primary/40 transition-colors text-center max-w-[90%]"
            aria-label={retryLabel}
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{retryLabel}</span>
          </button>
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {fetching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}
      <Image
        src={displaySrc}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={cn('object-cover', imageClassName)}
        onError={() => setFailed(true)}
      />
      {failed && canRetry && !fetching && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/90">
          <button
            type="button"
            onClick={handleRetry}
            className="flex flex-col items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">{retryLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
