'use client'

import Link from 'next/link'
import { Home, LayoutDashboard, MessageSquare, RefreshCw, Users } from 'lucide-react'
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

const navOps = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true, href: '/admin' },
  { icon: Users, label: 'Leads', href: '/admin' },
  { icon: MessageSquare, label: 'Mensajes', href: '/admin' },
]

export function AdminShell({
  children,
  lastUpdated,
  onRefresh,
  refreshing,
}: AdminShellProps): React.ReactElement {
  return (
    <div className="flex min-h-screen bg-pk-bg">
      {/* Sidebar — diseño admin.jsx */}
      <aside className="hidden w-56 shrink-0 flex-col bg-pk-deep text-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-5">
          <PeskidsLogo size={32} />
          <div>
            <p className="text-sm font-bold tracking-tight">Peskids</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4">
          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
            Operación
          </p>
          {navOps.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                item.active
                  ? 'bg-white/12 text-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 opacity-80" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="m-3 rounded-xl border border-pk-primary/30 bg-pk-primary/15 p-3">
          <p className="text-xs font-bold">Sede Llanogrande</p>
          <p className="text-[10px] text-white/60">Panel Opsly · tiempo real</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-pk-border bg-pk-surface px-5 sm:px-7">
          <div className="flex items-center gap-3 md:hidden">
            <PeskidsLogo size={28} />
            <span className="font-bold text-pk-ink">Admin</span>
          </div>
          <div className="hidden md:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-pk-mutedText">
              Dashboard
            </p>
            <p className="text-lg font-bold tracking-tight text-pk-ink">
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
