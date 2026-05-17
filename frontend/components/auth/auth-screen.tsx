'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

const HERO_IMAGE = '/images/hero/alternate-timelines.jpg'

type AuthScreenProps = {
  children: ReactNode
  title: string
  subtitle: string
}

export function AuthScreen({ children, title, subtitle }: AuthScreenProps) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[min(100%,28rem)] h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8 group">
          <span className="font-serif text-3xl font-bold tracking-tight text-white transition-opacity group-hover:opacity-90">
            Alt<span className="text-primary">Era</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-card/75 backdrop-blur-xl p-8 shadow-2xl shadow-black/40">
          <h1 className="font-serif text-2xl font-bold text-foreground mb-1">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link href="/timelines" className="hover:text-white/60 transition-colors">
            Browse timelines without signing in
          </Link>
        </p>
      </div>
    </div>
  )
}

export const authInputClassName =
  'w-full h-11 px-4 rounded-lg border border-border bg-background/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm'
