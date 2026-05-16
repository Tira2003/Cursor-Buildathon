'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Camera, ImageIcon, Upload, Loader2, CheckCircle2, Scan } from 'lucide-react'
import { Header } from '@/components/layout/header'

const PixelBlast = dynamic(() => import('@/components/visuals/pixel-blast'), { ssr: false })

export default function MuseumPage() {
  const router = useRouter()
  const artifactInputRef = useRef<HTMLInputElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const [artifactFile, setArtifactFile] = useState<File | null>(null)
  const [labelFile, setLabelFile] = useState<File | null>(null)
  const [artifactPreview, setArtifactPreview] = useState<string | null>(null)
  const [labelPreview, setLabelPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleArtifactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setArtifactFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setArtifactPreview(url)
    } else {
      setArtifactPreview(null)
    }
  }

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setLabelFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setLabelPreview(url)
    } else {
      setLabelPreview(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!artifactFile || isUploading) return

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('artifact', artifactFile)
      if (labelFile) formData.append('label', labelFile)

      const response = await fetch('/api/museum/scan', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload failed')
      router.push(`/museum/scan/${data.scanId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsUploading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* PixelBlast background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <PixelBlast
          variant="circle"
          pixelSize={4}
          color="#7c3aed"
          patternScale={3}
          patternDensity={0.85}
          enableRipples={true}
          rippleSpeed={0.35}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          edgeFade={0.18}
          speed={0.4}
          transparent={true}
          pixelSizeJitter={0.4}
        />
      </div>
      <div className="fixed inset-0 z-0 bg-background/70 pointer-events-none" />

      <div className="relative z-10">
        <Header />

        <main className="pt-24 pb-16 px-6 min-h-screen flex flex-col items-center justify-center">
          <div className="w-full max-w-lg">

            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors mb-10"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>

            {/* Main card */}
            <div className="relative drop-shadow-2xl overflow-hidden rounded-2xl bg-transparent/50 border border-white/20">
              {/* Transparent inner surface */}
              <div className="absolute inset-0.5 rounded-2xl bg-transparent z-[1]" />
              {/* Spotlight blur — top-left */}
              <div className="absolute w-80 h-64 bg-white/20 blur-[80px] -left-1/3 -top-1/3 z-[2] pointer-events-none" />
              {/* Primary color glow — bottom-right */}
              <div className="absolute w-64 h-64 bg-primary/15 blur-[70px] -right-1/4 -bottom-1/4 z-[2] pointer-events-none" />

              {/* Card content */}
              <div className="relative z-[3] p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Scan className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="font-serif text-2xl font-bold text-white">
                      Scan Museum Artifact
                    </h1>
                    <p className="text-sm text-white/50 mt-0.5">
                      AI vision analysis from your photos
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Artifact upload card */}
                  <UploadCard
                    label="Artifact photo"
                    icon={<Camera className="w-5 h-5" />}
                    file={artifactFile}
                    preview={artifactPreview}
                    hint="Required — photo of the artifact"
                    inputRef={artifactInputRef}
                    disabled={isUploading}
                    onChange={handleArtifactChange}
                  />

                  {/* Label upload card */}
                  <UploadCard
                    label="Label / placard"
                    icon={<ImageIcon className="w-5 h-5" />}
                    file={labelFile}
                    preview={labelPreview}
                    hint="Optional — descriptive label next to the artifact"
                    inputRef={labelInputRef}
                    disabled={isUploading}
                    onChange={handleLabelChange}
                  />

                  {error && (
                    <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                      {error}
                    </p>
                  )}

                  {/* Submit — animated frosted glass button */}
                  <button
                    type="submit"
                    disabled={!artifactFile || isUploading}
                    className="
                      group relative w-full overflow-hidden
                      mt-2 py-3.5 rounded-xl
                      border border-white/20 bg-white/10 backdrop-blur-md
                      text-white font-semibold text-sm
                      flex items-center justify-center gap-2.5
                      hover:border-white/40
                      active:scale-[0.98]
                      transition-all duration-300
                      disabled:opacity-40 disabled:cursor-not-allowed
                    "
                  >
                    {/* Sliding shimmer sweep on hover */}
                    <span
                      className="
                        pointer-events-none absolute inset-0
                        translate-x-[-110%] group-hover:translate-x-[110%]
                        bg-gradient-to-r from-transparent via-white/15 to-transparent
                        transition-transform duration-700 ease-in-out
                        skew-x-[-20deg]
                      "
                    />

                    {/* Subtle glow fill that grows on hover */}
                    <span
                      className="
                        pointer-events-none absolute inset-0 rounded-xl opacity-0
                        group-hover:opacity-100
                        bg-white/8
                        transition-opacity duration-300
                      "
                    />

                    {/* Content */}
                    <span className="relative flex items-center gap-2.5">
                      {isUploading ? (
                        <>
                          {/* Pulsing dots instead of a plain spinner */}
                          <span className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
                          </span>
                          Analyzing with AI…
                        </>
                      ) : (
                        <>
                          {/* Icon lifts slightly on hover */}
                          <Upload className="w-4 h-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                          Upload &amp; Analyze
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ── Upload sub-card ── */
interface UploadCardProps {
  label: string
  icon: React.ReactNode
  file: File | null
  preview: string | null
  hint: string
  inputRef: React.RefObject<HTMLInputElement | null>
  disabled: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function UploadCard({ label, icon, file, preview, hint, inputRef, disabled, onChange }: UploadCardProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">{label}</p>

      {/* Card inner panel */}
      <div className="relative overflow-hidden rounded-xl bg-[#2a292a] border border-white/8">
        {/* Tiny spotlight */}
        <div className="absolute w-40 h-28 bg-white/10 blur-[40px] -left-10 -top-10 pointer-events-none" />

        <div className="relative flex items-center gap-4 p-4">
          {/* Preview thumbnail or placeholder */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/25">{icon}</span>
            )}
            {file && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 truncate mb-0.5">
              {file ? file.name : 'No file chosen'}
            </p>
            <p className="text-xs text-white/35">{hint}</p>
          </div>

          {/* Frosted glass choose button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="
              shrink-0 px-4 py-2 rounded-lg
              border border-white/30 bg-transparent
              text-white text-sm font-medium
              hover:bg-white/10 hover:border-white/50
              active:scale-[0.97]
              transition-all duration-150
              disabled:opacity-40
            "
          >
            Choose
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onChange}
          />
        </div>
      </div>
    </div>
  )
}
