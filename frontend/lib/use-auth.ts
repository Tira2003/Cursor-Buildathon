'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useQuery } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/convex/_generated/api'

export function useAuth() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.users.current)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const loggedIn = mounted && !authLoading && isAuthenticated
  const isGuest = loggedIn && (currentUser?.isGuest ?? !currentUser?.email)
  const hasAccount = loggedIn && !isGuest
  const displayName = currentUser?.name?.trim() ?? (isGuest ? 'Guest' : '')
  const email = currentUser?.email?.trim() ?? ''

  const logout = useCallback(async () => {
    await signOut()
  }, [signOut])

  /** @deprecated Use /signin — Convex handles login */
  const login = useCallback((_name?: string) => {
    // no-op; kept for API compatibility with legacy call sites
  }, [])

  return { loggedIn, isGuest, hasAccount, displayName, email, login, logout, mounted }
}
