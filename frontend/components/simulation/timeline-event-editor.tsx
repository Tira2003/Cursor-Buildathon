'use client'

import { GitBranch, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { EditableTimelineEvent } from '@/lib/convex-ui'

interface TimelineEventEditorProps {
  events: EditableTimelineEvent[]
  onChange: (events: EditableTimelineEvent[]) => void
  disabled?: boolean
  propagating?: boolean
  simulateDirty?: boolean
  propagateError?: string | null
  onRippleForward?: (anchorIndex: number) => void
  onSimulateChanges?: () => void
}

export function TimelineEventEditor({
  events,
  onChange,
  disabled,
  propagating = false,
  simulateDirty = false,
  propagateError,
  onRippleForward,
  onSimulateChanges,
}: TimelineEventEditorProps) {
  const updateEvent = (index: number, patch: Partial<EditableTimelineEvent>) => {
    onChange(events.map((ev, i) => (i === index ? { ...ev, ...patch } : ev)))
  }

  const busy = disabled || propagating

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No timeline events to edit yet. Complete generation first.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {(simulateDirty || propagateError) && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {propagateError
                ? 'Simulation failed'
                : 'Unsaved edits — ripple downstream events to match your changes'}
            </p>
            {propagateError && (
              <p className="mt-1 text-sm text-destructive">{propagateError}</p>
            )}
          </div>
          {simulateDirty && onSimulateChanges && (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={onSimulateChanges}
              className="shrink-0 gap-2"
            >
              {propagating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Simulating…
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  Simulate changes
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <ul className="space-y-4">
        {events.map((event, index) => (
          <li
            key={`${event.year}-${index}`}
            className="rounded-xl border border-border bg-background/50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor={`event-year-${index}`}>
                Year
              </label>
              <input
                id={`event-year-${index}`}
                type="text"
                value={event.year}
                disabled={busy}
                onChange={(e) => updateEvent(index, { year: e.target.value })}
                className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                placeholder="Year"
              />
              <label className="sr-only" htmlFor={`event-impact-${index}`}>
                Impact
              </label>
              <select
                id={`event-impact-${index}`}
                value={event.impactLevel}
                disabled={busy}
                onChange={(e) =>
                  updateEvent(index, {
                    impactLevel: e.target.value as EditableTimelineEvent['impactLevel'],
                  })
                }
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
              >
                <option value="low">Low impact</option>
                <option value="medium">Medium impact</option>
                <option value="high">High impact</option>
              </select>
              {onRippleForward && index < events.length - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => onRippleForward(index)}
                  className="ml-auto gap-1.5"
                >
                  {propagating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitBranch className="h-3.5 w-3.5" />
                  )}
                  Ripple forward
                </Button>
              )}
            </div>
            <label className="sr-only" htmlFor={`event-title-${index}`}>
              Title
            </label>
            <input
              id={`event-title-${index}`}
              type="text"
              value={event.title}
              disabled={busy}
              onChange={(e) => updateEvent(index, { title: e.target.value })}
              className="mb-2 w-full rounded-lg border border-border bg-card px-3 py-2 font-medium text-foreground"
              placeholder="Event title"
            />
            <label className="sr-only" htmlFor={`event-desc-${index}`}>
              Description
            </label>
            <textarea
              id={`event-desc-${index}`}
              value={event.description}
              disabled={busy}
              onChange={(e) => updateEvent(index, { description: e.target.value })}
              rows={3}
              className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground"
              placeholder="Event description"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
