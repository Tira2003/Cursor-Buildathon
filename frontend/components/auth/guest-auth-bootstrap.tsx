'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { ReactNode, useEffect, useRef } from 'react'

/**
 * Ensures every visitor has a Convex Auth session via the anonymous provider.
 * Data is stored under a guest user until they optionally sign in with Google or email.
 */
export function GuestAuthBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn } = useAuthActions()
  const signingInRef = useRef(false)

  useEffect(() => {
    if (isLoading || isAuthenticated || signingInRef.current) return
    signingInRef.current = true
    void signIn('anonymous').finally(() => {
      signingInRef.current = false
    })
  }, [isAuthenticated, isLoading, signIn])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return <>{children}</>
}
