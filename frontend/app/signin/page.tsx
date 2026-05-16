'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FormEvent, Suspense, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'

function googleAuthErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (
    msg.includes('41') ||
    msg.includes('invalid_client') ||
    msg.includes('OAuth') ||
    msg.includes('client_id')
  ) {
    return 'Google sign-in is not configured. Use email/password, or set AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in Convex.'
  }
  return msg || 'Google sign-in failed.'
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  )
}

function SignInForm() {
  const { signIn } = useAuthActions()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo')?.trim() || '/timelines'
  const googleConfigured = useQuery(api.authStatus.googleOAuthConfigured)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')

  function authErrorMessage(err: unknown, flow: 'signIn' | 'signUp'): string {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('Invalid password')) {
      return 'Password must be at least 8 characters.'
    }
    if (msg.includes('InvalidAccountId')) {
      return flow === 'signIn'
        ? 'No account for this email. Create an account first.'
        : 'Could not create account. Try again.'
    }
    if (msg.includes('InvalidSecret') || msg.includes('Invalid credentials')) {
      return 'Wrong password. Try again.'
    }
    if (msg.includes('already exists')) {
      return 'An account with this email already exists. Sign in instead.'
    }
    return flow === 'signIn'
      ? 'Sign in failed. Try again or sign up.'
      : 'Sign up failed. Try again or sign in.'
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmedEmail = email.trim()

    if (mode === 'signUp' && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    try {
      await signIn('password', {
        email: trimmedEmail,
        password,
        flow: mode,
      })
      router.push(returnTo.startsWith('/') ? returnTo : '/timelines')
    } catch (err) {
      setError(authErrorMessage(err, mode))
    }
  }

  async function signInWithGoogle() {
    setError(null)
    if (googleConfigured === false) {
      setError(
        'Google sign-in is not configured. Use email/password, or run: npx convex env set AUTH_GOOGLE_ID … and AUTH_GOOGLE_SECRET …',
      )
      return
    }
    try {
      await signIn('google', {
        redirectTo: returnTo.startsWith('/') ? returnTo : '/timelines',
      })
    } catch (err) {
      setError(googleAuthErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-16 px-6">
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="rounded-lg border border-border bg-card p-6 md:p-8">
            <h1 className="font-serif text-2xl font-semibold text-foreground mb-2">
              {mode === 'signIn' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Save timelines, publish to the community, and track stabilize wins.
            </p>

            <div className="flex flex-col gap-4">
              {googleConfigured !== false && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => void signInWithGoogle()}
                >
                  Continue with Google
                </Button>
              )}
              {googleConfigured === false && (
                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Google sign-in is not set up on this deployment. Use email below.
                </p>
              )}
              <p className="text-center text-xs text-muted-foreground">or use email</p>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  required
                />
                <input
                  type="password"
                  placeholder={
                    mode === 'signUp' ? 'Password (min 8 characters)' : 'Password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-foreground"
                  minLength={mode === 'signUp' ? 8 : undefined}
                  required
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {mode === 'signIn' ? 'Sign in' : 'Sign up'}
                </Button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
                >
                  {mode === 'signIn'
                    ? 'Need an account? Sign up'
                    : 'Have an account? Sign in'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

