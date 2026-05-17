import { SimulatePageClient } from '@/components/simulate/simulate-page-client'

interface SimulatePageProps {
  params: Promise<{ id: string }>
}

export default async function SimulatePage({ params }: SimulatePageProps) {
  const { id } = await params
  // Guard malformed links like /simulate/<id>??whatIf=...
  const incidentId = id.replace(/\?+$/, '')
  return <SimulatePageClient incidentId={incidentId} />
}
