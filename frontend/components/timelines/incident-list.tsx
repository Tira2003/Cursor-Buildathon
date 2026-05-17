'use client'

import Link from 'next/link'
import { Calendar, Sparkles, ChevronRight } from 'lucide-react'
import { HistoricalImage } from '@/components/ui/historical-image'
import type { Id } from '@/convex/_generated/dataModel'
import type { Timeline } from '@/lib/types'

interface IncidentListProps {
  incidents: Timeline['incidents']
}

export function IncidentList({ incidents }: IncidentListProps) {
  return (
    <div className="space-y-4">
      {incidents.map((incident, index) => (
        <Link
          key={incident.id}
          href={`/simulate/${incident.id}`}
          className="group block"
        >
          <article
            className="relative rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                <HistoricalImage
                  src={incident.image}
                  alt={incident.title}
                  incidentId={incident.id as Id<'timelineIncidents'>}
                  className="w-full h-full"
                  sizes="80px"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {incident.date}
                  </span>
                </div>

                <h3 className="font-serif text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {incident.title}
                </h3>

                {incident.description && (
                  <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>
                )}

                {incident.context && (
                  <p className="text-sm text-muted-foreground/80 line-clamp-2">
                    {incident.context}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  What If?
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}

