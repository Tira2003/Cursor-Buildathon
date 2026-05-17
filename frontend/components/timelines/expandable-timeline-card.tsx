'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronDown, Sparkles, Send } from 'lucide-react'
import { HistoricalImage } from '@/components/ui/historical-image'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import type { Timeline, Incident } from '@/lib/types'
import {
  getExampleWhatIfs,
  getIncidentPlaceholder,
} from '@/lib/incident-prompts'

interface ExpandableTimelineCardProps {
  timeline: Timeline
  timelineDbId?: string
  incidentCount?: number
  index: number
  isExpanded?: boolean
  onToggle?: () => void
}

export function ExpandableTimelineCard({
  timeline,
  timelineDbId,
  incidentCount,
  index,
  isExpanded: isExpandedProp,
  onToggle,
}: ExpandableTimelineCardProps) {
  const router = useRouter()
  const [isExpandedLocal, setIsExpandedLocal] = useState(false)
  const isExpanded = isExpandedProp ?? isExpandedLocal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [whatIfInput, setWhatIfInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleExpand = () => {
    if (onToggle) {
      onToggle()
    } else {
      setIsExpandedLocal(!isExpandedLocal)
    }
    if (!isExpanded) {
      setSelectedIncident(null)
      setWhatIfInput('')
    }
  }

  const handleIncidentClick = (incident: Incident) => {
    setSelectedIncident(incident)
    setWhatIfInput('')
    setTimeout(() => inputRef.current?.focus(), 300)
  }

  const handleSubmitWhatIf = async () => {
    if (!whatIfInput.trim() || !selectedIncident) return

    setIsSubmitting(true)

    const params = new URLSearchParams()
    params.set('whatIf', whatIfInput.trim())
    if (timelineDbId) {
      params.set('timelineId', timelineDbId)
    }
    router.push(`/simulate/${selectedIncident.id}?${params.toString()}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitWhatIf()
    }
  }

  return (
    <article
      className="relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-500"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <button
        onClick={handleExpand}
        className="w-full text-left relative h-64 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset group"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40 z-10" />
          <HistoricalImage
            src={timeline.coverImage}
            alt={timeline.title}
            className="absolute inset-0 opacity-40 group-hover:opacity-50 transition-opacity duration-300"
            imageClassName="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            retryLabel="Reload image"
          />
        </div>

        <div className="relative z-20 h-full flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/80 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {timeline.era}
            </span>
            <span className="text-xs text-muted-foreground">
              {incidentCount ?? timeline.incidents.length} critical moment
              {(incidentCount ?? timeline.incidents.length) === 1 ? '' : 's'}
            </span>
          </div>

          <h2 className="font-serif text-2xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
            {timeline.title}
          </h2>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {timeline.description}
          </p>

          <div className="flex items-center gap-1 text-sm text-primary">
            <span>{isExpanded ? 'Collapse' : 'Explore Critical Moments'}</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-500 ease-out ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-border">
          <div className="p-4 space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              Select a moment to explore
            </p>

            {timeline.incidents.map((incident, i) => (
              <IncidentRow
                key={incident.id}
                incident={incident}
                isSelected={selectedIncident?.id === incident.id}
                onClick={() => handleIncidentClick(incident)}
                animationDelay={i * 100}
              />
            ))}
          </div>

          {selectedIncident && (
            <div className="border-t border-border p-4 bg-surface-elevated/50 animate-fade-in-up">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Rewrite History</h4>
                  <p className="text-sm text-muted-foreground">
                    What if something different happened during &ldquo;{selectedIncident.title}
                    &rdquo;?
                  </p>
                </div>
              </div>

              {selectedIncident.context && (
                <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Historical Context:</p>
                  {selectedIncident.context}
                </div>
              )}

              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={whatIfInput}
                  onChange={(e) => setWhatIfInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={getIncidentPlaceholder(selectedIncident)}
                  className="w-full h-24 px-4 py-3 pr-12 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  maxLength={200}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{whatIfInput.length}/200</span>
                  <Button
                    size="sm"
                    onClick={handleSubmitWhatIf}
                    disabled={!whatIfInput.trim() || isSubmitting}
                    className="gap-1"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Generating
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" />
                        Simulate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {getExampleWhatIfs(selectedIncident).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => setWhatIfInput(prompt)}
                    className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function IncidentRow({
  incident,
  isSelected,
  onClick,
  animationDelay,
}: {
  incident: Incident
  isSelected: boolean
  onClick: () => void
  animationDelay: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-300 group ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex gap-4">
        <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
          <HistoricalImage
            src={incident.image}
            alt={incident.title}
            incidentId={incident.id as Id<'timelineIncidents'>}
            className="w-full h-full"
            imageClassName="group-hover:scale-105 transition-transform duration-300"
            sizes="80px"
          />
          {isSelected && (
            <div className="absolute inset-0 bg-primary/20 animate-pulse pointer-events-none z-20" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-primary font-medium">{incident.date}</span>
          </div>
          <h4
            className={`font-medium mb-1 transition-colors ${
              isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
            }`}
          >
            {incident.title}
          </h4>
          {incident.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
          )}
        </div>

        <div
          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
          }`}
        >
          {isSelected && <Sparkles className="w-3 h-3 text-primary-foreground" />}
        </div>
      </div>
    </button>
  )
}
