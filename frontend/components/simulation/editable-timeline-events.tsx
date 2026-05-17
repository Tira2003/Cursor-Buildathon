'use client'

import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { Pencil, Save } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type EditableTimelineEvent = {
  year: string
  title: string
  description: string
  impactLevel: 'low' | 'medium' | 'high'
}

interface EditableTimelineEventsProps {
  simulationId: Id<'simulations'>
  events: EditableTimelineEvent[]
}

export function EditableTimelineEvents({
  simulationId,
  events: initialEvents,
}: EditableTimelineEventsProps) {
  const updateEvents = useMutation(api.simulations.updateEvents)
  const [events, setEvents] = useState(initialEvents)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  function patchEvent(index: number, patch: Partial<EditableTimelineEvent>) {
    setEvents((prev) =>
      prev.map((ev, i) => (i === index ? { ...ev, ...patch } : ev)),
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateEvents({ simulationId, events })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Pencil className="w-4 h-4" />
          Tap any field to edit timeline nodes, then save.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={saving}
          className="gap-2 shrink-0"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save timeline'}
        </Button>
      </div>

      <div className="relative pl-6 space-y-6">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-primary via-primary/50 to-transparent" />

        {events.map((event, index) => (
          <div key={`${event.year}-${index}`} className="relative">
            <div className="absolute -left-6 top-3 w-4 h-4 rounded-full bg-card border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-3 min-w-0">
              <Input
                value={event.year}
                onChange={(e) => patchEvent(index, { year: e.target.value })}
                placeholder="Year"
                className="font-medium max-w-[8rem]"
              />
              <Input
                value={event.title}
                onChange={(e) => patchEvent(index, { title: e.target.value })}
                placeholder="Event title"
                className="font-serif"
              />
              <Textarea
                value={event.description}
                onChange={(e) => patchEvent(index, { description: e.target.value })}
                placeholder="What changed in this alternate history?"
                rows={3}
                className="resize-y min-h-[4.5rem] break-words"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
