'use client'

import { useState, useEffect, useCallback } from 'react'

const KEY = 'altEra_loggedIn'
const NAME_KEY = 'altEra_displayName'

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLoggedIn(localStorage.getItem(KEY) === 'true')
    setDisplayName(localStorage.getItem(NAME_KEY) ?? '')

    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLoggedIn(e.newValue === 'true')
      if (e.key === NAME_KEY) setDisplayName(e.newValue ?? '')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const login = useCallback((name?: string) => {
    localStorage.setItem(KEY, 'true')
    if (name) localStorage.setItem(NAME_KEY, name)
    setLoggedIn(true)
    if (name) setDisplayName(name)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(KEY)
    localStorage.removeItem(NAME_KEY)
    setLoggedIn(false)
    setDisplayName('')
  }, [])

  return { loggedIn, displayName, login, logout, mounted }
}
