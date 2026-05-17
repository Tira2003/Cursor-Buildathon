'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useQuery } from 'convex/react'
import { ArrowLeft, Cpu, ImageIcon, Receipt, Zap } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { api } from '@/convex/_generated/api'
import { useAuth } from '@/lib/use-auth'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

function PageBackground() {
  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="circle"
          pixelSize={4}
          color="#7c3aed"
          patternScale={3}
          patternDensity={0.85}
          enableRipples={true}
          rippleSpeed={0.35}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          edgeFade={0.18}
          speed={0.4}
          transparent={true}
          pixelSizeJitter={0.4}
        />
      </div>
      <div className="fixed inset-0 z-0 bg-background/60 pointer-events-none" />
    </>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UsageBillingPage() {
  const router = useRouter()
  const { loggedIn, mounted } = useAuth()
  const summary = useQuery(api.usage.getMyUsageSummary, {})
  const events = useQuery(api.usage.listMyUsageEvents, { limit: 50 })

  useEffect(() => {
    if (mounted && !loggedIn) {
      router.replace('/signin')
    }
  }, [mounted, loggedIn, router])

  if (!mounted || !loggedIn) {
    return (
      <div className="relative min-h-screen bg-background">
        <PageBackground />
        <div className="relative z-10">
          <Header />
          <main className="pt-24 px-6">
            <p className="text-muted-foreground text-sm">Loading…</p>
          </main>
        </div>
      </div>
    )
  }

  const totals = summary?.totals
  const isLoading = summary === undefined

  return (
    <div className="relative min-h-screen bg-background">
      <PageBackground />
      <div className="relative z-10">
        <Header />

        <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Profile
          </Link>

          <div className="mb-10">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">
              Usage &amp; billing
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              API usage for Groq (timeline generation) and Serper (historical images).
              Costs are estimated from official provider rates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Receipt className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Total spend
                </span>
              </div>
              <p className="font-serif text-3xl font-bold text-foreground">
                {isLoading ? '…' : summary.formatted.totalCost}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Cpu className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">Groq</span>
              </div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {isLoading ? '…' : summary.formatted.groqCost}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading
                  ? '…'
                  : `${formatTokens(totals!.groqInputTokens)} in · ${formatTokens(totals!.groqOutputTokens)} out · ${totals!.groqCallCount} calls`}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">Serper</span>
              </div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {isLoading ? '…' : summary.formatted.serperCost}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isLoading ? '…' : `${totals!.serperRequests} image searches`}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  API calls
                </span>
              </div>
              <p className="font-serif text-3xl font-bold text-foreground">
                {isLoading ? '…' : totals!.totalApiCalls}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 mb-8">
            <h2 className="font-serif text-xl font-bold text-foreground mb-4">
              Rate card
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Service</th>
                    <th className="pb-3 pr-4 font-medium">Input</th>
                    <th className="pb-3 font-medium">Output</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.rateLabels ?? []).map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 text-foreground">{row.label}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.inputRate}</td>
                      <td className="py-3 text-muted-foreground">{row.outputRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-serif text-xl font-bold text-foreground mb-4">
              Recent activity
            </h2>
            {events === undefined ? (
              <p className="text-sm text-muted-foreground">Loading activity…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API usage recorded yet. Run a simulation or museum scan to see costs here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">When</th>
                      <th className="pb-3 pr-4 font-medium">Feature</th>
                      <th className="pb-3 pr-4 font-medium">Provider</th>
                      <th className="pb-3 pr-4 font-medium">Usage</th>
                      <th className="pb-3 font-medium text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr
                        key={ev._id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(ev.createdAt)}
                        </td>
                        <td className="py-3 pr-4 text-foreground">{ev.featureLabel}</td>
                        <td className="py-3 pr-4 text-muted-foreground capitalize">
                          {ev.provider}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {ev.provider === 'groq'
                            ? `${ev.inputTokens ?? 0} / ${ev.outputTokens ?? 0} tokens`
                            : `${ev.serperRequests ?? 1} req`}
                        </td>
                        <td className="py-3 text-right font-medium text-foreground">
                          {ev.costFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  )
}
