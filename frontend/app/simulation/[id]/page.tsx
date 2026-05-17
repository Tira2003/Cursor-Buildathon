import { Suspense } from 'react'
import { SimulationViewerClient } from '@/components/simulation/simulation-viewer-client'

interface SimulationPageProps {
  params: Promise<{ id: string }>
}

export default async function SimulationPage({ params }: SimulationPageProps) {
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading simulation...</p>
        </div>
      </div>
    }>
      <SimulationViewerClient simulationId={id} />
    </Suspense>
  )
}
