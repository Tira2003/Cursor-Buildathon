'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Trophy, Flame, GitBranch, LogOut } from 'lucide-react'
import { useMutation } from 'convex/react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { mockUserProfile } from '@/lib/mock-data'
import { useAuth } from '@/lib/use-auth'
import { api } from '@/convex/_generated/api'

export default function ProfilePage() {
  const router = useRouter()
  const { logout, displayName, email } = useAuth()
  const updateDisplayName = useMutation(api.users.updateDisplayName)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState('')
  const [savingName, setSavingName] = useState(false)
  const profile = mockUserProfile

  const stats = [
    {
      icon: Trophy,
      value: profile.stabilizeWins,
      label: 'Stabilize wins',
      sub: 'Chaos below 40',
      iconClass: 'text-chaos-green',
      bgClass: 'bg-chaos-green/10',
    },
    {
      icon: Flame,
      value: profile.chaosPublished,
      label: 'Chaos published',
      sub: 'High-chaos timelines',
      iconClass: 'text-chaos-amber',
      bgClass: 'bg-chaos-amber/10',
    },
    {
      icon: GitBranch,
      value: profile.simulationsCount,
      label: 'Simulations',
      sub: 'Total created',
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
  ]

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  async function handleSaveDisplayName(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameError('Display name is required.')
      return
    }
    setNameError('')
    setSavingName(true)
    try {
      await updateDisplayName({ name: trimmed })
      setNameDraft('')
    } catch {
      setNameError('Could not save display name. Try again.')
    } finally {
      setSavingName(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/community"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Community
          </Link>

          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-3">
                Your profile
              </h1>
              <p className="text-muted-foreground">
                Track stabilize wins and chaotic timelines you have published.
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-red-400 hover:border-red-400/40 transition-colors mt-1"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <p className="text-sm text-muted-foreground mb-1">Signed in as</p>
            {displayName ? (
              <div>
                <p className="text-lg text-foreground">{displayName}</p>
                {email && (
                  <p className="text-sm text-muted-foreground mt-1">{email}</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveDisplayName} className="mt-2 space-y-3">
                {email && (
                  <p className="text-sm text-foreground">{email}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Add a display name to show in the header instead of your email.
                </p>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="HistoryBuff_42"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm"
                  disabled={savingName}
                />
                {nameError && (
                  <p className="text-sm text-destructive">{nameError}</p>
                )}
                <Button type="submit" size="sm" disabled={savingName}>
                  Save display name
                </Button>
              </form>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-card p-6 flex flex-col items-center text-center"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${stat.bgClass} flex items-center justify-center mb-4`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.iconClass}`} />
                </div>
                <p className="font-serif text-4xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-sm font-medium text-foreground mb-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/my-timelines" className="flex-1">
              <Button variant="outline" className="w-full h-12 border-border">
                My simulations
              </Button>
            </Link>
            <Link href="/timelines" className="flex-1">
              <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
                Create timeline
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
