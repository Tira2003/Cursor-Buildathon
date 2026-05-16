'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Trophy, RefreshCw, AlertTriangle } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { ChaosMeter } from '@/components/simulation/chaos-meter'
import { useDemoMode } from '@/lib/useDemoMode'
import type { StabilizeFix } from '@/lib/types'

interface StabilizeGameClientProps {
  simulationId: string
}

function estimateReduction(initialChaos: number, count: number): number {
  if (count === 0) return 10
  return Math.max(8, Math.floor((initialChaos - 35) / count))
}

export function StabilizeGameClient({ simulationId }: StabilizeGameClientProps) {
  const demo = useDemoMode()
  const sim = useQuery(api.simulations.get, {
    simulationId: simulationId as Id<'simulations'>,
  })
  const startChallenge = useAction(api.actions.stabilizeTimeline.startChallenge)
  const submitFixes = useAction(api.actions.stabilizeTimeline.submitFixes)
  const recordAttempt = useMutation(api.stabilization.recordAttempt)

  const initialChaos = sim?.chaosScore ?? 0
  const [fixes, setFixes] = useState<StabilizeFix[]>([])
  const [currentChaos, setCurrentChaos] = useState(initialChaos)
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading')
  const [isApplying, setIsApplying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (sim?.chaosScore !== undefined) {
      setCurrentChaos(sim.chaosScore)
    }
  }, [sim?.chaosScore])

  useEffect(() => {
    if (!simulationId) return
    setGameState('loading')
    setLoadError(null)
    void startChallenge({ simulationId: simulationId as Id<'simulations'>, demo })
      .then((r) => {
        const reduction = estimateReduction(sim?.chaosScore ?? 80, r.correctiveChoices.length)
        const mapped: StabilizeFix[] = r.correctiveChoices.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          chaosReduction: reduction,
          selected: demo && (c.id === 'fix_2' || c.id === 'fix_4'),
        }))
        setFixes(mapped)
        setGameState('playing')
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Could not load stabilize challenge.')
        setGameState('playing')
      })
  }, [simulationId, demo, startChallenge, sim?.chaosScore])

  const selectedFixes = fixes.filter((f) => f.selected)
  const totalReduction = selectedFixes.reduce((sum, f) => sum + f.chaosReduction, 0)
  const projectedChaos = Math.max(0, initialChaos - totalReduction)

  const handleFixToggle = (fixId: string) => {
    if (gameState !== 'playing' || isApplying) return
    setFixes((prev) =>
      prev.map((f) => (f.id === fixId ? { ...f, selected: !f.selected } : f)),
    )
  }

  const handleApplyFixes = async () => {
    if (selectedFixes.length === 0 || gameState !== 'playing') return

    setIsApplying(true)
    try {
      const correctiveChoices = fixes.map(({ id, title, description }) => ({
        id,
        title,
        description,
      }))
      const r = await submitFixes({
        simulationId: simulationId as Id<'simulations'>,
        selectedChoiceIds: selectedFixes.map((f) => f.id),
        correctiveChoices,
        demo,
      })
      await recordAttempt({
        targetSimulationId: simulationId as Id<'simulations'>,
        correctiveChoices,
        selectedChoiceIds: selectedFixes.map((f) => f.id),
        resultingChaosScore: r.resultingChaosScore,
      })

      const targetChaos = r.resultingChaosScore
      const steps = 20
      const stepDelay = 50
      const chaosStep = (currentChaos - targetChaos) / steps

      for (let i = 0; i < steps; i++) {
        await new Promise((resolve) => setTimeout(resolve, stepDelay))
        setCurrentChaos((prev) => Math.max(targetChaos, prev - chaosStep))
      }
      setCurrentChaos(targetChaos)
      setGameState(r.won ? 'won' : 'lost')
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to apply fixes.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleRetry = () => {
    setFixes((prev) => prev.map((f) => ({ ...f, selected: false })))
    setCurrentChaos(initialChaos)
    setGameState('playing')
    setLoadError(null)
  }

  if (sim === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-24 px-6">
          <p className="text-foreground">Simulation not found or private.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href={`/simulation/${simulationId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Simulation
          </Link>

          <div className="text-center mb-8">
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-3">
              Stabilize the Timeline
            </h1>
            <p className="text-muted-foreground">
              Pick fixes until chaos drops below 40
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <ChaosMeter
              score={Math.round(currentChaos)}
              size="lg"
              animated={false}
            />
          </div>

          {loadError && (
            <p className="text-sm text-destructive text-center mb-6">{loadError}</p>
          )}

          {selectedFixes.length > 0 && gameState === 'playing' && (
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground">
                Projected chaos after fixes:
                <span
                  className={`ml-2 font-bold ${projectedChaos < 40 ? 'text-chaos-green' : 'text-chaos-amber'}`}
                >
                  {projectedChaos}
                </span>
                <span className="block text-xs mt-1 text-muted-foreground/80">
                  Final score is determined when you apply fixes
                </span>
              </p>
            </div>
          )}

          {gameState === 'won' && (
            <div className="rounded-lg border border-chaos-green/30 bg-chaos-green/5 p-6 mb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-chaos-green/20 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-chaos-green" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
                Timeline Stabilized!
              </h2>
              <p className="text-muted-foreground mb-4">
                Chaos is now {Math.round(currentChaos)}. Win recorded on your profile.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link href={`/simulation/${simulationId}`}>
                  <Button variant="outline">View Timeline</Button>
                </Link>
                <Link href="/profile">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {gameState === 'lost' && (
            <div className="rounded-lg border border-chaos-red/30 bg-chaos-red/5 p-6 mb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-chaos-red/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-chaos-red" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
                Timeline Still Unstable
              </h2>
              <p className="text-muted-foreground mb-4">
                Chaos is {Math.round(currentChaos)}. Try different combinations of fixes.
              </p>
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {(gameState === 'playing' || gameState === 'loading') && fixes.length > 0 && (
            <>
              <div className="space-y-3 mb-8">
                {fixes.map((fix) => (
                  <button
                    key={fix.id}
                    type="button"
                    onClick={() => handleFixToggle(fix.id)}
                    disabled={isApplying || gameState === 'loading'}
                    className={`w-full p-4 rounded-lg border text-left transition-all ${
                      fix.selected
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/50'
                    } ${isApplying ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground mb-1">{fix.title}</h3>
                        <p className="text-sm text-muted-foreground">{fix.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-chaos-green font-medium">
                          ~{fix.chaosReduction}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            fix.selected ? 'border-primary bg-primary' : 'border-muted'
                          }`}
                        >
                          {fix.selected && (
                            <Check className="w-4 h-4 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => void handleApplyFixes()}
                disabled={
                  selectedFixes.length === 0 ||
                  isApplying ||
                  gameState === 'loading'
                }
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-lg"
              >
                {isApplying ? (
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Applying Fixes...
                  </span>
                ) : gameState === 'loading' ? (
                  'Loading fixes…'
                ) : (
                  `Apply ${selectedFixes.length} Fix${selectedFixes.length !== 1 ? 'es' : ''}`
                )}
              </Button>
            </>
          )}

          {gameState === 'loading' && fixes.length === 0 && !loadError && (
            <p className="text-center text-muted-foreground">Loading corrective choices…</p>
          )}
        </div>
      </main>
    </div>
  )
}
