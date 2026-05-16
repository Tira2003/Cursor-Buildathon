import { NextResponse } from 'next/server'
import { mockMuseumScan } from '@/lib/mock-data'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const artifact = formData.get('artifact')
    const label = formData.get('label')

    if (!artifact || !(artifact instanceof Blob)) {
      return NextResponse.json(
        { error: 'Artifact photo is required' },
        { status: 400 }
      )
    }

    // Simulate backend AI vision processing
    await new Promise((resolve) => setTimeout(resolve, 1800))

    const scanId = `scan-${Date.now()}`

    return NextResponse.json({
      scanId,
      scan: {
        ...mockMuseumScan,
        id: scanId,
        hasLabel: Boolean(label),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to analyze artifact' },
      { status: 500 }
    )
  }
}
