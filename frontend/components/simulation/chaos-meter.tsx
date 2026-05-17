'use client'

import { useEffect, useState } from 'react'
import { Activity, Zap, AlertTriangle } from 'lucide-react'

interface ChaosMeterProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  variant?: 'circular' | 'card'
}

export function ChaosMeter({ score, size = 'md', animated = true, variant = 'circular' }: ChaosMeterProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)
  
  useEffect(() => {
    if (!animated) {
      setDisplayScore(score)
      return
    }
    
    const duration = 2000
    const startTime = Date.now()
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(score * eased))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [score, animated])
  
  const getColor = () => {
    if (displayScore < 40) return { 
      main: 'var(--chaos-green)', 
      bg: 'rgba(34, 197, 94, 0.1)',
      gradient: 'from-chaos-green/20 to-chaos-green/5'
    }
    if (displayScore < 70) return { 
      main: 'var(--chaos-amber)', 
      bg: 'rgba(245, 158, 11, 0.1)',
      gradient: 'from-chaos-amber/20 to-chaos-amber/5'
    }
    return { 
      main: 'var(--chaos-red)', 
      bg: 'rgba(220, 38, 38, 0.1)',
      gradient: 'from-chaos-red/20 to-chaos-red/5'
    }
  }
  
  const getLabel = () => {
    if (displayScore < 40) return 'Stable'
    if (displayScore < 70) return 'Unstable'
    return 'Fracturing'
  }

  const getIcon = () => {
    if (displayScore < 40) return Activity
    if (displayScore < 70) return Zap
    return AlertTriangle
  }
  
  const colors = getColor()
  const Icon = getIcon()

  // Card variant - new bento-friendly design
  if (variant === 'card') {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${colors.gradient} p-6`}>
        {/* Background glow */}
        <div 
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-50"
          style={{ backgroundColor: colors.main }}
        />
        
        <div className="relative">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: colors.bg }}
            >
              <Icon className="w-5 h-5" style={{ color: colors.main }} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Chaos Index</h4>
              <p className="text-xs text-muted-foreground/70">Timeline stability</p>
            </div>
          </div>

          {/* Score display */}
          <div className="flex items-end gap-2 mb-4">
            <span 
              className="text-5xl font-serif font-bold"
              style={{ color: colors.main }}
            >
              {displayScore}
            </span>
            <span className="text-lg text-muted-foreground mb-2">/100</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${displayScore}%`,
                backgroundColor: colors.main,
                boxShadow: `0 0 12px ${colors.main}`
              }}
            />
          </div>

          {/* Status label */}
          <div className="flex items-center justify-between">
            <span 
              className="text-sm font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.main }}
            >
              {getLabel()}
            </span>
            <span className="text-xs text-muted-foreground">
              {displayScore < 40 ? 'No action needed' : displayScore < 70 ? 'Monitor closely' : 'Stabilize recommended'}
            </span>
          </div>
        </div>
      </div>
    )
  }
  
  // Original circular variant
  const sizes = {
    sm: { width: 100, stroke: 8, fontSize: 'text-lg', labelSize: 'text-xs' },
    md: { width: 160, stroke: 12, fontSize: 'text-3xl', labelSize: 'text-sm' },
    lg: { width: 200, stroke: 16, fontSize: 'text-4xl', labelSize: 'text-base' },
  }
  
  const { width, stroke, fontSize, labelSize } = sizes[size]
  const radius = (width - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (displayScore / 100) * circumference
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="transform -rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={stroke}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={colors.main}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              transition: animated ? 'stroke-dashoffset 0.3s ease-out' : 'none',
              filter: `drop-shadow(0 0 8px ${colors.main})`,
            }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-serif font-bold ${fontSize}`} style={{ color: colors.main }}>
            {displayScore}
          </span>
          <span className={`${labelSize} text-muted-foreground`}>
            {getLabel()}
          </span>
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          Chaos Index
        </span>
      </div>
    </div>
  )
}
