'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  CalendarClock,
  type LucideIcon,
  Home,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Users,
} from 'lucide-react'
import { PeskidsLogo } from '@/components/brand/peskids-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

interface AdminShellProps {
  children: React.ReactNode
  lastUpdated: Date | null
  onRefresh?: () => void
  refreshing?: boolean
}

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

const navOps = [
  { icon: Home, label: 'Landing', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Leads', href: '/admin#leads' },
  { icon: MessageSquare, label: 'Feedback', href: '/admin#feedback' },
  { icon: CalendarClock, label: 'Follow-up', href: '/admin#follow-up' },
] satisfies NavItem[]

export function AdminShell({
  children,
  lastUpdated,
  onRefresh,
  refreshing,
}: AdminShellProps): React.ReactElement {
  const pathname = usePathname()
  const [hash, setHash] = useState('')

  useEffect(() => {
    const syncHash = (): void => {
      setHash(window.location.hash)
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)
    window.addEventListener('popstate', syncHash)

    return () => {
      window.removeEventListener('hashchange', syncHash)
      window.removeEventListener('popstate', syncHash)
    }
  }, [])

  const isActive = (item: NavItem): boolean => {
    if (item.label === 'Landing') {
      return pathname === '/'
    }

    if (pathname !== '/admin') {
      return false
    }

    if (item.label === 'Dashboard') {
      return hash === '' || hash === '#dashboard'
    }

    if (item.label === 'Leads') {
      return hash === '#leads'
    }

    if (item.label === 'Feedback') {
      return hash === '#feedback'
    }

    if (item.label === 'Follow-up') {
      return hash === '#follow-up'
    }

    return false
  }

  return (
    <div className="flex min-h-screen bg-pk-bg">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/8 bg-[#11253d] text-white md:flex">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <PeskidsLogo size={34} />
            <div>
              <p className="text-sm font-semibold tracking-tight">Peskids</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                Admin
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Sede activa
            </p>
            <p className="mt-1 text-sm font-medium text-white">Llanogrande</p>
            <p className="text-xs text-white/55">Operación, soporte y seguimiento de familias.</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            Panel
          </p>
          {navOps.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
                isActive(item)
                  ? 'bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'text-white/72 hover:bg-white/7 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 opacity-80" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-pk-border bg-pk-surface px-5 py-3 sm:px-7">
          <div className="flex items-center gap-3 md:hidden">
            <PeskidsLogo size={28} />
            <div>
              <p className="text-sm font-semibold text-pk-ink">Peskids</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                Admin
              </p>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-pk-border bg-pk-muted px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
                Operación en vivo
              </span>
              <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700">
                Llanogrande
              </span>
            </div>
            <p className="mt-1 text-lg font-semibold tracking-tight text-pk-ink">
              {new Date().toLocaleDateString('es-CO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated ? (
              <span className="hidden text-xs text-pk-mutedText sm:inline">
                {formatRelativeTime(lastUpdated)}
              </span>
            ) : null}
            {onRefresh ? (
              <Button variant="secondary" size="sm" onClick={onRefresh} disabled={refreshing}>
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              </Button>
            ) : null}
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
