'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { StoryImmersiveGallery } from '@/components/simulation/story-immersive-gallery'
import { SimulationDetailsBento } from '@/components/simulation/simulation-details-bento'
import {
  TimelineBuildingScreen,
  TIMELINE_BUILDING_PHASES,
} from '@/components/simulation/timeline-building-screen'
import {
  collectEditableEvents,
  getStorySlidesFromResolvedEvents,
  mapConvexStatus,
  mapSimulationToUi,
  STORY_SLIDE_FALLBACK_IMAGE,
  type EditableTimelineEvent,
} from '@/lib/convex-ui'
import { getStorySlides } from '@/lib/mock-data'
import { useDemoMode } from '@/lib/useDemoMode'
import type { SimulationStatus } from '@/lib/types'

interface SimulationViewerClientProps {
  simulationId: string
}

export function SimulationViewerClient({ simulationId }: SimulationViewerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const whatIfParam = searchParams.get('whatIf')
  const demo = useDemoMode()

  const convexSim = useQuery(api.simulations.get, {
    simulationId: simulationId as Id<'simulations'>,
  })
  const me = useQuery(api.users.current)
  const incidentCtx = useQuery(
    api.incidents.get,
    convexSim?.changedIncidentId
      ? { incidentId: convexSim.changedIncidentId }
      : 'skip',
  )

  const selectBranch = useMutation(api.simulations.selectBranch)
  const saveSimulation = useMutation(api.simulations.save)
  const updateEvents = useMutation(api.simulations.updateEvents)
  const publishSimulation = useMutation(api.published.publish)
  const startRemix = useMutation(api.remix.start)
  const generatePhaseTwo = useAction(api.actions.generatePhaseTwo.run)
  const propagateTimelineEdit = useAction(api.actions.propagateTimelineEdit.run)
  const [phase2Loading, setPhase2Loading] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [editableEvents, setEditableEvents] = useState<EditableTimelineEvent[]>([])
  const [galleryEvents, setGalleryEvents] = useState<
    { year: string; title: string; description: string; imageUrl?: string }[] | null
  >(null)
  const [eventsDirty, setEventsDirty] = useState(false)
  const [propagating, setPropagating] = useState(false)
  const [propagateError, setPropagateError] = useState<string | null>(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [publishBusy, setPublishBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const eventsInitialized = useRef(false)
  const baselineEventsRef = useRef<EditableTimelineEvent[]>([])
  const rippleAnchorRef = useRef<number | null>(null)

  const simulation = convexSim
    ? mapSimulationToUi(convexSim, incidentCtx?.incident ?? null)
    : null
  const status: SimulationStatus = convexSim
    ? phase2Loading
      ? 'phase2_generating'
      : mapConvexStatus(convexSim.status)
    : 'generating'
  const selectedBranch = simulation?.selectedBranch
  const isOwner = Boolean(me && convexSim && me._id === convexSim.userId)
  const isPublished = convexSim?.visibility === 'public'

  useEffect(() => {
    if (!convexSim || eventsInitialized.current) return
    if (convexSim.status !== 'editable' && convexSim.status !== 'saved' && convexSim.status !== 'published') {
      return
    }
    const initial = collectEditableEvents(convexSim)
    setEditableEvents(initial)
    baselineEventsRef.current = initial.map((e) => ({ ...e }))
    rippleAnchorRef.current = null
    setGalleryEvents(null)
    eventsInitialized.current = true
  }, [convexSim])

  useEffect(() => {
    eventsInitialized.current = false
    setEventsDirty(false)
    setEditableEvents([])
    setGalleryEvents(null)
    setPropagateError(null)
    baselineEventsRef.current = []
    rippleAnchorRef.current = null
  }, [simulationId])

  useEffect(() => {
    if (convexSim !== undefined) return

    let totalDelay = 0
    const timers = TIMELINE_BUILDING_PHASES.map((phase, index) => {
      const timer = setTimeout(() => setCurrentPhase(index), totalDelay)
      totalDelay += phase.duration
      return timer
    })

    return () => timers.forEach(clearTimeout)
  }, [convexSim])

  const simulateDirty = useMemo(() => {
    const baseline = baselineEventsRef.current
    if (editableEvents.length === 0 || baseline.length === 0) return false
    if (baseline.length !== editableEvents.length) return true
    return editableEvents.some(
      (e, i) =>
        e.year !== baseline[i]?.year ||
        e.title !== baseline[i]?.title ||
        e.description !== baseline[i]?.description ||
        e.impactLevel !== baseline[i]?.impactLevel,
    )
  }, [editableEvents])

  const handleEventsChange = useCallback((events: EditableTimelineEvent[]) => {
    setEditableEvents(events)
    setEventsDirty(true)
    setPropagateError(null)
  }, [])

  const eventsToPropagatePayload = useCallback(
    () =>
      editableEvents.map(({ year, title, description, impactLevel }) => ({
        year,
        title,
        description,
        impactLevel,
      })),
    [editableEvents],
  )

  const applyPropagatedEvents = useCallback(
    (
      events: {
        year: string
        title: string
        description: string
        impactLevel: 'low' | 'medium' | 'high'
        imageUrl?: string
      }[],
    ) => {
      const updated: EditableTimelineEvent[] = events.map((e) => ({
        year: e.year,
        title: e.title,
        description: e.description,
        impactLevel: e.impactLevel,
        imageUrl: e.imageUrl,
      }))
      setEditableEvents(updated)
      setGalleryEvents(events)
      baselineEventsRef.current = updated.map((e) => ({ ...e }))
      setEventsDirty(false)
      setPropagateError(null)
    },
    [],
  )

  const findEditedAnchor = useCallback((): number => {
    const baseline = baselineEventsRef.current
    let lastEdited = 0
    for (let i = 0; i < editableEvents.length; i++) {
      const b = baseline[i]
      const c = editableEvents[i]
      if (
        !b ||
        c.year !== b.year ||
        c.title !== b.title ||
        c.description !== b.description ||
        c.impactLevel !== b.impactLevel
      ) {
        lastEdited = i
      }
    }
    return lastEdited
  }, [editableEvents])

  const runPropagate = useCallback(
    async (anchorIndex: number) => {
      if (!isOwner || editableEvents.length === 0) return
      setPropagating(true)
      setPropagateError(null)
      try {
        const result = await propagateTimelineEdit({
          simulationId: simulationId as Id<'simulations'>,
          anchorIndex,
          events: eventsToPropagatePayload(),
          demo,
        })
        applyPropagatedEvents(result.events)
        rippleAnchorRef.current = anchorIndex
        setActionMessage('Downstream timeline events updated.')
      } catch (err) {
        setPropagateError(
          err instanceof Error ? err.message : 'Ripple simulation failed.',
        )
      } finally {
        setPropagating(false)
      }
    },
    [
      applyPropagatedEvents,
      demo,
      editableEvents.length,
      eventsToPropagatePayload,
      isOwner,
      propagateTimelineEdit,
      simulationId,
    ],
  )

  const handleRippleForward = useCallback(
    (anchorIndex: number) => {
      rippleAnchorRef.current = anchorIndex
      void runPropagate(anchorIndex)
    },
    [runPropagate],
  )

  const handleSimulateChanges = useCallback(() => {
    const anchor =
      rippleAnchorRef.current ?? findEditedAnchor()
    void runPropagate(anchor)
  }, [findEditedAnchor, runPropagate])

  const persistEventsIfNeeded = useCallback(async () => {
    if (!eventsDirty || editableEvents.length === 0) return
    await updateEvents({
      simulationId: simulationId as Id<'simulations'>,
      events: editableEvents,
    })
    setEventsDirty(false)
  }, [eventsDirty, editableEvents, simulationId, updateEvents])

  const handleSave = async () => {
    if (!isOwner) return
    setSaveBusy(true)
    setActionMessage(null)
    try {
      await persistEventsIfNeeded()
      await saveSimulation({ simulationId: simulationId as Id<'simulations'> })
      setActionMessage('Timeline saved with your edits.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaveBusy(false)
    }
  }

  const handlePublish = async () => {
    if (!isOwner || !convexSim || !simulation) return
    setPublishBusy(true)
    setActionMessage(null)
    try {
      await persistEventsIfNeeded()
      await saveSimulation({ simulationId: simulationId as Id<'simulations'> })
      const title =
        incidentCtx?.incident.title ??
        `Alternate timeline: ${simulation.whatIf.slice(0, 60)}`
      const description =
        simulation.ripples[0] ??
        simulation.whatIf
      await publishSimulation({
        simulationId: simulationId as Id<'simulations'>,
        title,
        description,
      })
      setActionMessage('Published to the community dashboard.')
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Publish failed.')
    } finally {
      setPublishBusy(false)
    }
  }

  const handleRemix = async () => {
    if (!convexSim) return
    if (convexSim.visibility !== 'public') {
      if (convexSim.source === 'museum' && convexSim.museumScanId) {
        router.push(`/museum`)
        return
      }
      if (convexSim.changedIncidentId) {
        router.push(`/simulate/${convexSim.changedIncidentId}`)
      } else {
        router.push('/timelines')
      }
      return
    }

    try {
      const newId = await startRemix({
        originalSimulationId: simulationId as Id<'simulations'>,
        source: convexSim.source,
        changedIncidentId: convexSim.changedIncidentId,
      })

      if (convexSim.source === 'museum' && convexSim.museumScanId) {
        router.push(`/museum/remix/${newId}`)
        return
      }

      if (!convexSim.changedIncidentId) {
        router.push('/timelines')
        return
      }

      const timelineId =
        incidentCtx?.timeline._id ?? convexSim.originalTimelineId
      const qs = new URLSearchParams({ remixSimulationId: newId })
      if (timelineId) qs.set('timelineId', timelineId)
      router.push(`/simulate/${convexSim.changedIncidentId}?${qs.toString()}`)
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : 'Remix failed. Sign in and try again.',
      )
    }
  }

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

  if (convexSim === null) {
    return (
      <div className="min-h-screen bg-background px-6 pt-24">
        <p className="text-foreground">Simulation not found or private.</p>
      </div>
    )
  }

  const museumStillGenerating =
    convexSim?.source === 'museum' &&
    (convexSim.status === 'draft' ||
      convexSim.status === 'generating' ||
      convexSim.events.length === 0)

  if (convexSim === undefined || !simulation || museumStillGenerating) {
    const buildingWhatIf =
      whatIfParam ||
      convexSim?.whatIfPrompt ||
      'Generating alternate timeline from your museum artifact…'
    return (
      <TimelineBuildingScreen
        whatIf={buildingWhatIf}
        currentPhase={currentPhase}
      />
    )
  }

  const incidentImage =
    incidentCtx?.incident.relatedImageUrl ?? simulation.relicImage
  const displayEvents =
    galleryEvents ??
    (convexSim.events.length > 0 ? convexSim.events : null)
  const storySlides =
    displayEvents && displayEvents.length > 0
      ? getStorySlidesFromResolvedEvents(
          displayEvents,
          incidentImage ?? STORY_SLIDE_FALLBACK_IMAGE,
        )
      : getStorySlides(simulation, incidentImage)

  return (
    <div className="min-h-screen bg-background">
      <StoryImmersiveGallery
        cards={storySlides}
        whatIf={simulation.whatIf}
        simulationId={simulationId}
        incidentId={simulation.incidentId}
        galleryLoading={propagating}
        onRemix={handleRemix}
        remixHint={
          isPublished
            ? convexSim.source === 'museum'
              ? 'Remix with a new time span (reuses artifact photos)'
              : 'Start a remix from this published timeline'
            : undefined
        }
      />

      {convexSim.apiUsage && (
        <p className="px-6 pb-2 text-center text-xs text-muted-foreground">
          AI usage: {convexSim.apiUsage.groq} Groq request
          {convexSim.apiUsage.groq === 1 ? '' : 's'}, {convexSim.apiUsage.serper} image search
          {convexSim.apiUsage.serper === 1 ? '' : 'es'} ({convexSim.apiUsage.total} total API
          calls)
        </p>
      )}

      <SimulationDetailsBento
        simulation={simulation}
        simulationId={simulationId}
        status={status}
        selectedBranch={selectedBranch}
        timelineTitle={incidentCtx?.timeline.title}
        incidentDate={incidentCtx?.incident.year}
        incidentTitle={incidentCtx?.incident.title}
        onBranchSelect={handleBranchSelect}
        branchGeneratingSlot={
          status === 'phase2_generating' ? <BranchGeneratingAnimation /> : undefined
        }
        isOwner={isOwner}
        isPublished={isPublished}
        onSave={handleSave}
        onPublish={handlePublish}
        saveBusy={saveBusy}
        publishBusy={publishBusy}
        actionMessage={actionMessage}
        editableEvents={editableEvents}
        onEventsChange={handleEventsChange}
        relicPrompt={convexSim.relicPrompt}
        propagating={propagating}
        simulateDirty={simulateDirty}
        propagateError={propagateError}
        onRippleForward={isOwner ? handleRippleForward : undefined}
        onSimulateChanges={isOwner ? handleSimulateChanges : undefined}
      />
    </div>
  )
}

function BranchGeneratingAnimation() {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center py-10">
      <div className="relative mb-8 h-36 w-56">
        <div className="absolute top-0 left-1/2 h-14 w-0.5 -translate-x-1/2 bg-primary" />
        <div className="absolute top-14 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary" />
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 192 128">
          <path
            d="M 96 48 Q 48 64, 24 112"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
          <path
            d="M 96 48 L 96 112"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-pulse"
            style={{ animationDelay: '200ms' }}
          />
          <path
            d="M 96 48 Q 144 64, 168 112"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="animate-pulse"
            style={{ animationDelay: '400ms' }}
          />
        </svg>
        <div className="absolute bottom-0 left-[12.5%] h-3 w-3 animate-pulse rounded-full bg-chaos-green" />
        <div
          className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 animate-pulse rounded-full bg-chaos-amber"
          style={{ animationDelay: '200ms' }}
        />
        <div
          className="absolute right-[12.5%] bottom-0 h-3 w-3 animate-pulse rounded-full bg-chaos-red"
          style={{ animationDelay: '400ms' }}
        />
      </div>
      <p className="text-xl font-medium text-foreground">Following the chosen path{dots}</p>
      <p className="mt-2 text-base text-muted-foreground">
        Generating consequences and timeline artifacts
      </p>
    </div>
  )
}
