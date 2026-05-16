'use client'

import { useConvexAuth, useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Camera, Upload } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { RequireAuth } from '@/components/auth/require-auth'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'

const MAX_BYTES = 12 * 1024 * 1024

function readPreview(file: File | null): string | null {
  if (!file) return null
  return URL.createObjectURL(file)
}

export function MuseumUploadClient() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <RequireAuth returnTo="/museum">
            <MuseumUploadForm />
          </RequireAuth>
        </div>
      </main>
    </div>
  )
}

function MuseumUploadForm() {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl)
  const createScan = useMutation(api.museumScans.create)
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()

  const [artifactFile, setArtifactFile] = useState<File | null>(null)
  const [labelFile, setLabelFile] = useState<File | null>(null)
  const [skipLabel, setSkipLabel] = useState(false)
  const [artifactPreview, setArtifactPreview] = useState<string | null>(null)
  const [labelPreview, setLabelPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = readPreview(artifactFile)
    setArtifactPreview(url)
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [artifactFile])

  useEffect(() => {
    const url = readPreview(labelFile)
    setLabelPreview(url)
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [labelFile])

  async function uploadFile(file: File): Promise<string> {
    if (file.size > MAX_BYTES) {
      throw new Error('Each photo must be under 12 MB.')
    }
    const url = await generateUploadUrl()
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
      body: file,
    })
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status}). Try a smaller image.`)
    }
    const { storageId } = (await res.json()) as { storageId: string }
    return storageId
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!artifactFile) return
    if (!skipLabel && !labelFile) return

    setLoading(true)
    setError(null)
    try {
      const artifactImageId = await uploadFile(artifactFile)
      const labelImageId = skipLabel
        ? undefined
        : await uploadFile(labelFile!)
      const scanId = await createScan({
        artifactImageId: artifactImageId as Id<'_storage'>,
        labelImageId: labelImageId as Id<'_storage'> | undefined,
      })
      router.push(`/museum/scan/${scanId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setLoading(false)
    }
  }

  const canSubmit =
    isAuthenticated &&
    artifactFile &&
    (skipLabel || labelFile) &&
    !loading

  return (
    <div className="rounded-lg border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">
            Scan Museum Artifact
          </h1>
          <p className="text-sm text-muted-foreground">
            Live Groq vision reads your photos — no <code className="text-xs">?demo=1</code>{' '}
            needed when Convex <code className="text-xs">DEMO_MODE</code> is off.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className="text-sm font-medium text-foreground">
          Artifact photo
          <input
            name="artifact"
            type="file"
            accept="image/*"
            capture="environment"
            required
            onChange={(e) => setArtifactFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
          />
        </label>
        {artifactPreview && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={artifactPreview}
              alt="Artifact preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={skipLabel}
            onChange={(e) => {
              setSkipLabel(e.target.checked)
              if (e.target.checked) setLabelFile(null)
            }}
            className="rounded border-border"
          />
          No separate label photo (we will analyze the artifact image twice)
        </label>

        {!skipLabel && (
          <label className="text-sm font-medium text-foreground">
            Museum label / placard photo
            <input
              name="label"
              type="file"
              accept="image/*"
              capture="environment"
              required={!skipLabel}
              onChange={(e) => setLabelFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-primary-foreground"
            />
          </label>
        )}
        {labelPreview && (
          <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg border border-border bg-muted">
            <Image
              src={labelPreview}
              alt="Label preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? (
            'Uploading & starting analysis…'
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              Upload & analyze
            </span>
          )}
        </Button>
      </form>
    </div>
  )
}
