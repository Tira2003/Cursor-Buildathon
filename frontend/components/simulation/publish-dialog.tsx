'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { Send, Globe2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

type PublishDialogProps = {
  simulationId: Id<'simulations'>
  defaultTitle: string
  defaultDescription?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PublishDialog({
  simulationId,
  defaultTitle,
  defaultDescription,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const existing = useQuery(api.published.getForSimulation, { simulationId })
  const publish = useMutation(api.published.publish)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(existing?.title ?? defaultTitle.slice(0, 80))
    setDescription(
      existing?.description ?? defaultDescription?.slice(0, 240) ?? '',
    )
  }, [open, existing, defaultTitle, defaultDescription])

  const isUpdate = Boolean(existing)

  async function handleSubmit() {
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()
    if (!trimmedTitle) {
      toast.error('Add a title before publishing.')
      return
    }
    if (!trimmedDescription) {
      toast.error('Add a short description before publishing.')
      return
    }
    setSubmitting(true)
    try {
      await publish({
        simulationId,
        title: trimmedTitle,
        description: trimmedDescription,
      })
      toast.success(
        isUpdate ? 'Community post updated' : 'Posted to Community',
      )
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not publish. Try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-2xl">
            <Globe2 className="w-5 h-5 text-primary" />
            {isUpdate ? 'Update Community post' : 'Publish to Community'}
          </DialogTitle>
          <DialogDescription>
            Make this timeline visible on the Community tab so others can read,
            remix, or stabilize it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="What's the headline of this alternate history?"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-foreground text-sm"
              disabled={submitting}
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {title.length}/120
            </p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Short description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 320))}
              placeholder="A 1-2 sentence hook so others understand the twist."
              className="w-full min-h-[88px] px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm leading-relaxed resize-none"
              disabled={submitting}
              maxLength={320}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {description.length}/320
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
            {submitting
              ? 'Publishing…'
              : isUpdate
                ? 'Update post'
                : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
