'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UserCircle2, LogOut, Receipt } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/use-auth'

const navLinks = [
  { href: '/timelines', label: 'Browse Timelines' },
  { href: '/museum', label: 'Museum' },
  { href: '/community', label: 'Community' },
  { href: '/my-timelines', label: 'My Timelines' },
  { href: '/account/usage', label: 'Usage & Billing' },
]

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { loggedIn, displayName, logout, mounted } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    await logout()
    setDropdownOpen(false)
    router.push('/')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 px-5 py-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-serif text-2xl font-bold tracking-tight text-white">
              Alt<span className="text-primary">Era</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href === '/timelines' && pathname.startsWith('/timelines')) ||
                (link.href === '/museum' && pathname.startsWith('/museum')) ||
                (link.href === '/my-timelines' && pathname.startsWith('/my-timelines')) ||
                (link.href === '/community' && pathname.startsWith('/community')) ||
                (link.href === '/account/usage' && pathname.startsWith('/account/usage'))

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-white/65 hover:text-white hover:bg-white/8'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side — auth-aware.
              Always render a fixed-width container so the navbar never shifts.
              Before hydration (mounted=false) we show the logged-out buttons
              as the default — they'll swap to the profile button if needed. */}
          <div className="flex items-center gap-2 shrink-0">
            {mounted && loggedIn ? (
              /* Logged-in: profile avatar + dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  <UserCircle2 className="w-5 h-5 text-primary" />
                  <span className="hidden sm:inline max-w-[120px] truncate">
                    {displayName || 'Profile'}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden z-50">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <UserCircle2 className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/my-timelines"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      My Timelines
                    </Link>
                    <Link
                      href="/account/usage"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      <Receipt className="w-4 h-4" />
                      Usage &amp; Billing
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors border-t border-white/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out (also the pre-hydration default): Login + Sign up */
              <>
                <Link
                  href="/signin"
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    pathname === '/signin'
                      ? 'text-white bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  )}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/85 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
