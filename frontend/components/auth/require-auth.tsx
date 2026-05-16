'use client'

import Link from 'next/link'
import { useConvexAuth } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RequireAuthProps = {
  children: React.ReactNode
  /** Path to return to after sign-in, e.g. `/museum` */
  returnTo: string
  title?: string
  description?: string
}

export function RequireAuth({
  children,
  returnTo,
  title = 'Sign in required',
  description = 'Create an account or sign in to upload museum photos and run live AI analysis.',
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useConvexAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Checking session…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    const signInHref = `/signin?returnTo=${encodeURIComponent(returnTo)}`
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h2 className="font-serif text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={signInHref}>
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              Sign in to continue
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full sm:w-auto">
              Back to home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
