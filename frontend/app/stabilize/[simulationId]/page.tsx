import { StabilizeGameClient } from '@/components/stabilize/stabilize-game-client'

interface StabilizePageProps {
  params: Promise<{ simulationId: string }>
}

export default async function StabilizePage({ params }: StabilizePageProps) {
  const { simulationId } = await params
  return <StabilizeGameClient simulationId={simulationId} />
}
