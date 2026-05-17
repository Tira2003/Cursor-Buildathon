'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { 
  ArrowLeft,
  Home,
  Share2, 
  Bookmark, 
  AlertTriangle, 
  Gamepad2, 
  GitBranch, 
  Waves, 
  Zap,
  ChevronRight,
  Shuffle,
  Globe2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChaosMeter } from '@/components/simulation/chaos-meter'
import { LedgerSplit } from '@/components/simulation/ledger-split'
import { EditableTimelineEvents } from '@/components/simulation/editable-timeline-events'
import { RelicImage } from '@/components/simulation/relic-image'
import { FullscreenStoryViewer } from '@/components/simulation/fullscreen-story-viewer'
import { AuroraLoadingScreen } from '@/components/simulation/aurora-loading-screen'
import { BranchChoice } from '@/components/simulation/branch-choice'
import { PublishDialog } from '@/components/simulation/publish-dialog'
import { mapConvexStatus, mapIncident, mapSimulationToUi } from '@/lib/convex-ui'
import { useDemoMode } from '@/lib/useDemoMode'
import { useAuth } from '@/lib/use-auth'
import { shareSimulationLink } from '@/lib/share-simulation'
import { isConvexSimulationId, isMockSimulationId } from '@/lib/simulation-id'
import { getIncidentById, getSimulationById } from '@/lib/mock-data'
import type { SimulationStatus } from '@/lib/types'
import { toast } from 'sonner'

interface SimulationViewerClientProps {
  simulationId: string
}

export function SimulationViewerClient({ simulationId }: SimulationViewerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const whatIfParam = searchParams.get('whatIf')
  const demo = useDemoMode()
  const detailsRef = useRef<HTMLDivElement>(null)

  const convexId = isConvexSimulationId(simulationId)
  const mockId = isMockSimulationId(simulationId)

  const convexSim = useQuery(
    api.simulations.get,
    convexId
      ? { simulationId: simulationId as Id<'simulations'> }
      : 'skip',
  )
  const incidentCtx = useQuery(
    api.incidents.get,
    convexSim?.changedIncidentId
      ? { incidentId: convexSim.changedIncidentId }
      : 'skip',
  )
  const selectBranch = useMutation(api.simulations.selectBranch)
  const saveSimulation = useMutation(api.simulations.save)
  const makeSimulationPublic = useMutation(api.simulations.makePublic)
  const generatePhaseTwo = useAction(api.actions.generatePhaseTwo.run)
  const generateRelicImage = useAction(api.actions.generateRelicImage.run)
  const fetchSimulationImages = useAction(
    api.actions.fetchSimulationEventImages.fetchForSimulation,
  )
  const [phase2Loading, setPhase2Loading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const { loggedIn, mounted: authMounted } = useAuth()
  const currentUser = useQuery(api.users.current)
  const publishedRecord = useQuery(
    api.published.getForSimulation,
    convexId
      ? { simulationId: simulationId as Id<'simulations'> }
      : 'skip',
  )
  const isOwner = Boolean(
    convexSim && currentUser?._id && convexSim.userId === currentUser._id,
  )
  const isPublished = Boolean(publishedRecord)
  const canPublish = Boolean(
    convexId && isOwner && convexSim?.chaosScore !== undefined,
  )

  const mockSim = mockId ? getSimulationById(simulationId) : undefined

  const mappedIncident = incidentCtx
    ? mapIncident(incidentCtx.incident, incidentCtx.timeline.slug)
    : null

  const simulation = convexSim
    ? mapSimulationToUi(convexSim, mappedIncident)
    : mockSim
      ? { ...mockSim, whatIf: whatIfParam ?? mockSim.whatIf }
      : null
  const status: SimulationStatus = convexSim
    ? phase2Loading
      ? 'phase2_generating'
      : mapConvexStatus(convexSim.status)
    : mockSim
      ? mapConvexStatus(mockSim.status)
      : 'generating'

  const remixHref = `/simulation/${simulationId}/remix${
    whatIfParam ? `?whatIf=${encodeURIComponent(whatIfParam)}` : ''
  }`

  const goToRemix = () => router.push(remixHref)

  const signInRedirect = `/signin?redirect=${encodeURIComponent(`/simulation/${simulationId}`)}`
  const isSaved =
    convexSim?.status === 'saved' || convexSim?.status === 'published'

  const handleSave = async () => {
    if (!convexId) {
      toast.info('Demo timelines are preview-only — run a simulation from Browse Timelines to save.')
      return
    }
    if (!authMounted) return
    if (!loggedIn) {
      router.push(signInRedirect)
      return
    }
    if (isSaved) {
      toast.info('Already saved to My Timelines')
      return
    }
    setIsSaving(true)
    try {
      await saveSimulation({
        simulationId: simulationId as Id<'simulations'>,
      })
      toast.success('Saved to My Timelines')
    } catch {
      toast.error('Could not save. Sign in and try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async (shareTitle: string) => {
    setIsSharing(true)
    try {
      if (loggedIn) {
        try {
          await makeSimulationPublic({
            simulationId: simulationId as Id<'simulations'>,
          })
        } catch {
          // Non-owners cannot make public; still share URL for their own copy
        }
      }
      const result = await shareSimulationLink({
        simulationId,
        title: shareTitle,
      })
      if (result === 'shared') {
        toast.success('Shared!')
      } else if (!loggedIn) {
        toast.success('Link copied — sign in so others can open it')
      } else {
        toast.success('Link copied to clipboard')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error('Could not share. Copy the URL from your browser.')
    } finally {
      setIsSharing(false)
    }
  }

  useEffect(() => {
    if (
      convexSim?.status === 'editable' &&
      convexSim.relicPrompt &&
      !convexSim.relicImageUrl
    ) {
      void generateRelicImage({
        simulationId: simulationId as Id<'simulations'>,
        demo,
      })
    }
  }, [
    convexSim?.status,
    convexSim?.relicPrompt,
    convexSim?.relicImageUrl,
    simulationId,
    demo,
    generateRelicImage,
  ])

  useEffect(() => {
    if (!convexSim || convexSim.events.length === 0) return
    const needsSerper = convexSim.events.some(
      (ev) => !ev.imageUrl && !ev.imageStorageId,
    )
    if (!needsSerper) return
    void fetchSimulationImages({
      simulationId: simulationId as Id<'simulations'>,
    })
  }, [convexSim, simulationId, fetchSimulationImages])

  const handleBranchSelect = async (branchId: string) => {
    setPhase2Loading(true)
    try {
      await selectBranch({
        simulationId: simulationId as Id<'simulations'>,
        selectedBranchId: branchId,
      })
      await generatePhaseTwo({
        simulationId: simulationId as Id<'simulations'>,
        demo,
      })
    } finally {
      setPhase2Loading(false)
    }
  }
  
  const scrollToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
  
  if ((convexId && convexSim === null) || (mockId && !mockSim)) {
    return (
      <div className="min-h-screen bg-background px-6 pt-24">
        <p className="text-foreground">Simulation not found or private.</p>
      </div>
    )
  }

  if ((convexId && convexSim === undefined) || !simulation) {
    return (
      <AuroraLoadingScreen
        whatIfPrompt={whatIfParam || simulation?.whatIf || 'Generating alternate timeline...'}
      />
    )
  }

  const mockIncident = mockSim ? getIncidentById(mockSim.incidentId) : undefined
  const incidentData = incidentCtx
    ? { timeline: { title: incidentCtx.timeline.title }, incident: { date: incidentCtx.incident.year, title: incidentCtx.incident.title } }
    : mockIncident
      ? {
          timeline: { title: mockIncident.timeline.title },
          incident: { date: mockIncident.incident.date, title: mockIncident.incident.title },
        }
      : null

  const showBranchChoice =
    status === 'phase1_complete' &&
    simulation.branches.length > 0 &&
    !simulation.selectedBranch

  const hasStoryCards = simulation.storyCards && simulation.storyCards.length > 0
  const isHighChaos = simulation.chaosScore >= 70
  const needsStabilization = simulation.chaosScore >= 40
  const displayWhatIf =
    simulation.whatIf ||
    (convexSim?.museumArtifactName
      ? `What if history unfolded across ${convexSim.selectedDurationLabel ?? 'this span'} starting from the ${convexSim.museumArtifactName}?`
      : 'Alternate history from the museum artifact')
  const museumDescription = convexSim?.museumArtifactDescription
  const relicImageUrl =
    simulation.relicImage ?? convexSim?.museumArtifactImageUrl
  
  return (
    <div className="min-h-screen bg-background">
      {convexId && canPublish && (
        <PublishDialog
          simulationId={simulationId as Id<'simulations'>}
          defaultTitle={displayWhatIf}
          defaultDescription={museumDescription ?? simulation.relicPrompt ?? undefined}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      )}

      {/* Fullscreen Story Viewer */}
      {hasStoryCards && (
        <FullscreenStoryViewer
          cards={simulation.storyCards!}
          whatIf={displayWhatIf}
          onScrollToDetails={scrollToDetails}
          onShare={() => void handleShare(displayWhatIf)}
          onSave={() => void handleSave()}
          onRemix={goToRemix}
          isSaved={isSaved}
          isSaving={isSaving}
          isSharing={isSharing}
        />
      )}

      {/* Details Section - Below the fold */}
      <div ref={detailsRef}>
        {/* Sticky Quick Actions Bar */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Back navigation */}
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
                <Link
                  href="/timelines"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Timelines</span>
                </Link>
              </div>

              {/* Quick Navigation Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => scrollToSection('ripples')}
                  className="h-11 px-4 gap-2"
                >
                  <Waves className="w-5 h-5" />
                  <span className="hidden md:inline">Ripples</span>
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => scrollToSection('consequences')}
                  className="h-11 px-4 gap-2"
                >
                  <GitBranch className="w-5 h-5" />
                  <span className="hidden md:inline">Consequences</span>
                </Button>
                {needsStabilization && (
                  <Link href={`/simulation/${simulationId}/stabilize`}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 px-4 gap-2 border-chaos-amber/50 text-chaos-amber hover:bg-chaos-amber/10"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      <span className="hidden md:inline">Stabilize</span>
                    </Button>
                  </Link>
                )}
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-11 w-11 p-0"
                  disabled={isSharing}
                  onClick={() => void handleShare(displayWhatIf)}
                  aria-label="Share simulation"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-11 w-11 p-0"
                  disabled={isSaving || isSaved}
                  onClick={() => void handleSave()}
                  aria-label={isSaved ? 'Simulation saved' : 'Save simulation'}
                >
                  <Bookmark className={isSaved ? 'fill-current' : undefined} />
                </Button>
                {canPublish && (
                  <Button
                    variant={isPublished ? 'outline' : 'default'}
                    size="lg"
                    className={
                      isPublished
                        ? 'h-11 px-4 gap-2 border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10'
                        : 'h-11 px-4 gap-2 bg-emerald-500 hover:bg-emerald-500/90 text-white'
                    }
                    onClick={() => setPublishOpen(true)}
                    aria-label={isPublished ? 'Update community post' : 'Publish to community'}
                  >
                    <Globe2 className="w-5 h-5" />
                    <span className="hidden sm:inline">
                      {isPublished ? 'Published' : 'Publish'}
                    </span>
                  </Button>
                )}
                <Button
                  size="lg"
                  className="h-11 px-4 gap-2 bg-primary hover:bg-primary/90"
                  onClick={goToRemix}
                >
                  <Shuffle className="w-5 h-5" />
                  <span className="hidden sm:inline">Remix</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-12">
          <div className="max-w-6xl mx-auto">
            
            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              
              {/* What-If Card - Spans 2 columns */}
              <div className="md:col-span-2 lg:col-span-2 rounded-2xl border border-border bg-card p-8">
                {incidentData && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {incidentData.timeline.title} &middot; {incidentData.incident.date}
                  </p>
                )}
                {convexSim?.museumArtifactName && !incidentData && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Museum artifact &middot; {convexSim?.selectedDurationLabel ?? 'Alternate span'}
                  </p>
                )}
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4 break-words">
                  &ldquo;{displayWhatIf}&rdquo;
                </h1>
                {museumDescription && (
                  <p className="text-muted-foreground leading-relaxed mb-4 break-words text-pretty">
                    {museumDescription}
                  </p>
                )}
                {incidentData && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">Original event:</span>
                    <span className="text-sm font-medium text-foreground">{incidentData.incident.title}</span>
                  </div>
                )}
              </div>

              {/* Chaos Score Card */}
              <div className="lg:col-span-1">
                <ChaosMeter score={simulation.chaosScore} variant="card" animated={true} />
              </div>

              {/* Timeline Fracturing Warning - Full width if high chaos */}
              {isHighChaos && (
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="relative overflow-hidden rounded-2xl border border-chaos-red/30 bg-gradient-to-r from-chaos-red/10 via-chaos-red/5 to-transparent p-6">
                    {/* Animated background pulse */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,_var(--tw-gradient-stops))] from-chaos-red/20 via-transparent to-transparent animate-pulse" />
                    
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-chaos-red/20 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-7 h-7 text-chaos-red" />
                        </div>
                        <div>
                          <h3 className="text-xl font-serif font-bold text-foreground mb-2">
                            Timeline Fracturing Detected
                          </h3>
                          <p className="text-muted-foreground max-w-xl">
                            This alternate history has dangerously high chaos levels. The timeline fabric is 
                            becoming unstable and may collapse. Stabilization is strongly recommended.
                          </p>
                        </div>
                      </div>
                      
                      <Link href={`/simulation/${simulationId}/stabilize`}>
                        <Button 
                          size="lg" 
                          className="h-14 px-8 gap-3 bg-chaos-red hover:bg-chaos-red/90 text-white whitespace-nowrap"
                        >
                          <Gamepad2 className="w-6 h-6" />
                          Stabilize Now
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showBranchChoice && (
              <div className="mb-12 rounded-2xl border border-border bg-card p-8">
                <BranchChoice
                  branches={simulation.branches}
                  onSelect={handleBranchSelect}
                  selectedBranch={simulation.selectedBranch}
                />
                {phase2Loading && (
                  <p className="mt-4 text-sm text-muted-foreground">Following the chosen path…</p>
                )}
              </div>
            )}

            {/* Ripple Effects Section */}
            <div id="ripples" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Waves className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">Ripple Effects</h2>
                  <p className="text-sm text-muted-foreground">How history unfolded differently</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-8 min-w-0">
                {convexSim && convexSim.events.length > 0 ? (
                  <EditableTimelineEvents
                    simulationId={simulationId as Id<'simulations'>}
                    events={convexSim.events}
                  />
                ) : mockSim && mockSim.ripples.length > 0 ? (
                  <ul className="space-y-3 text-sm text-muted-foreground list-disc pl-5">
                    {mockSim.ripples.map((ripple) => (
                      <li key={ripple}>{ripple}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No timeline events yet.</p>
                )}
              </div>
            </div>

            {convexSim?.source === 'museum' && (
              <div className="mb-12">
                <RelicImage
                  imageUrl={relicImageUrl}
                  prompt={simulation.relicPrompt}
                  altText={convexSim?.museumArtifactName ?? 'Museum artifact'}
                />
              </div>
            )}

            {/* Consequences Section - Ledger Split */}
            <div id="consequences" className="mb-12 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-foreground">Consequences</h2>
                  <p className="text-sm text-muted-foreground">What was lost and what emerged</p>
                </div>
              </div>
              <LedgerSplit 
                extinct={simulation.extinct} 
                born={simulation.born}
                animated={true}
              />
            </div>

            {/* Bottom CTA - If needs stabilization */}
            {needsStabilization && !isHighChaos && (
              <div className="rounded-2xl border border-chaos-amber/30 bg-gradient-to-r from-chaos-amber/10 via-chaos-amber/5 to-transparent p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-chaos-amber/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-chaos-amber" />
                    </div>
                    <div>
                      <h3 className="text-lg font-serif font-bold text-foreground mb-1">
                        Timeline Instability
                      </h3>
                      <p className="text-muted-foreground">
                        This timeline shows signs of instability. Play the Stabilize game to reduce chaos and secure this alternate history.
                      </p>
                    </div>
                  </div>
                  
                  <Link href={`/simulation/${simulationId}/stabilize`}>
                    <Button 
                      size="lg" 
                      className="h-12 px-6 gap-2 bg-chaos-amber hover:bg-chaos-amber/90 text-black"
                    >
                      <Gamepad2 className="w-5 h-5" />
                      Play Stabilize
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
