'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarClock,
  type LucideIcon,
  LayoutGrid,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Users,
  Settings,
  Bell,
} from 'lucide-react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { createClient } from '@/lib/supabase-browser';

interface AdminShellProps {
  children: React.ReactNode;
  lastUpdated: Date | null;
  onRefresh?: () => void;
  refreshing?: boolean;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

const navOps = [
  { icon: Home, label: 'Landing', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: LayoutGrid, label: 'Academia', href: '/admin#academy' },
  { icon: ShieldCheck, label: 'Equipo', href: '/admin#team' },
  { icon: GraduationCap, label: 'Clases', href: '/admin#classes' },
  { icon: Users, label: 'Interesados', href: '/admin#leads' },
  { icon: MessageSquare, label: 'Feedback', href: '/admin#feedback' },
  { icon: CalendarClock, label: 'Follow-up', href: '/admin#follow-up' },
  { icon: Inbox, label: 'Mensajes', href: '/admin/messages' },
  { icon: Settings, label: 'Configuración', href: '/admin/settings' },
  { icon: Bell, label: 'Notificaciones', href: '/settings/notifications' },
] satisfies NavItem[];

interface ConversationsApiResponse {
  conversations?: Array<{ unreadCount: number }>;
}

export function AdminShell({
  children,
  lastUpdated,
  onRefresh,
  refreshing,
}: AdminShellProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    const syncHash = (): void => {
      setHash(window.location.hash);
    };

    syncHash();
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);

    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
    };
  }, []);

  // Poll for unread message count every 30s
  useEffect(() => {
    const fetchUnread = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/messages', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as ConversationsApiResponse;
        const total = (data.conversations ?? []).reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
        setUnreadMessages(total);
      } catch {
        // silently ignore
      }
    };

    void fetchUnread();
    const interval = setInterval(() => {
      void fetchUnread();
    }, 30_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const [sedeLabel, setSedeLabel] = useState('Llanogrande');

  useEffect(() => {
    const fetchSettings = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/settings', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as { settings?: { sede_label?: string } };
        if (data.settings?.sede_label) {
          setSedeLabel(data.settings.sede_label);
        }
      } catch {
        // keep default
      }
    };

    void fetchSettings();
  }, []);

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    setSignOutError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.push('/admin/login');
      router.refresh();
    } catch {
      setSignOutError('No se pudo cerrar sesión. Intenta de nuevo.');
    } finally {
      setSigningOut(false);
    }
  };

  const isActive = (item: NavItem): boolean => {
    if (item.label === 'Landing') {
      return pathname === '/';
    }

    if (item.label === 'Mensajes') {
      return pathname.startsWith('/admin/messages');
    }

    if (item.label === 'Configuración') {
      return pathname.startsWith('/admin/settings');
    }

    if (item.label === 'Notificaciones') {
      return pathname.startsWith('/settings/notifications');
    }

    if (pathname !== '/admin') {
      return false;
    }

    if (item.label === 'Dashboard') {
      return hash === '' || hash === '#dashboard';
    }

    if (item.label === 'Academia') {
      return hash === '#academy';
    }

    if (item.label === 'Equipo') {
      return hash === '#team';
    }

    if (item.label === 'Clases') {
      return hash === '#classes';
    }

    if (item.label === 'Interesados') {
      return hash === '#leads';
    }

    if (item.label === 'Feedback') {
      return hash === '#feedback';
    }

    if (item.label === 'Follow-up') {
      return hash === '#follow-up';
    }

    return false;
  };

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
            <p className="mt-1 text-sm font-medium text-white">{sedeLabel}</p>
            <p className="text-xs text-white/55">Operación, soporte y seguimiento de familias.</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            Panel
          </p>
          {navOps.map((item) => {
            const showBadge = item.label === 'Mensajes' && unreadMessages > 0;
            return (
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
                <span className="flex-1">{item.label}</span>
                {showBadge ? (
                  <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </span>
                ) : null}
              </Link>
            );
          })}
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
                {sedeLabel}
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
            <NotificationBell />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="ml-1 hidden sm:inline">Cerrar sesión</span>
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </header>

        {signOutError ? (
          <p className="border-b border-red-100 bg-red-50 px-5 py-2 text-center text-xs text-red-800 sm:px-7">
            {signOutError}
          </p>
        ) : null}

        <main className="flex-1 overflow-auto p-5 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
