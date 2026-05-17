'use client'

import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function formatCompact(n: number): string {
  if (n >= 10_000) return `${Math.floor(n / 1000)}k+`
  if (n >= 1000) {
    const k = n / 1000
    const rounded = k >= 10 ? Math.floor(k) : Math.round(k * 10) / 10
    return `${rounded}k+`
  }
  return `${n}+`
}

type AnimatedStatProps = {
  value: number
  animate: boolean
  format?: 'plain' | 'plus' | 'compact'
  className?: string
}

export function AnimatedStat({
  value,
  animate,
  format = 'plain',
  className,
}: AnimatedStatProps) {
  const [display, setDisplay] = useState(0)
  const displayRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    displayRef.current = display
  }, [display])

  useEffect(() => {
    if (!animate) return

    const from = displayRef.current
    const to = value
    const duration = 1200
    let startTime: number | null = null

    const tick = (now: number) => {
      if (startTime === null) startTime = now
      const progress = Math.min((now - startTime) / duration, 1)
      const next = Math.round(from + (to - from) * easeOutCubic(progress))
      setDisplay(next)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [value, animate])

  const formatted =
    format === 'plus'
      ? `${display}+`
      : format === 'compact'
        ? formatCompact(display)
        : String(display)

  return <p className={className}>{formatted}</p>
}
