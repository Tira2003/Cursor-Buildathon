import { Suspense } from 'react'
import { RemixPageClient } from '@/components/simulation/remix-page-client'

interface RemixPageProps {
  params: Promise<{ id: string }>
}

export default async function RemixPage({ params }: RemixPageProps) {
  const { id } = await params

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <RemixPageClient simulationId={id} />
    </Suspense>
  )
}
