'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PeskidsLogo } from '@/components/brand/peskids-logo';
import { RoleSwitcher } from '@/components/admin/role-switcher';
import {
  dispatchOpenImprovementChat,
  ImprovementChatPopup,
} from '@/components/admin/improvement-chat-popup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CapacityAlertBanner } from '@/components/admin/capacity-alert-banner';
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

/** Hash → data-admin-section (aliases for legacy links). */
const HASH_SECTION_ALIASES: Record<string, string> = {
  'follow-up': 'seguimientos',
  dashboard: 'inicio',
  overview: 'inicio',
  interesados: 'leads',
};

const navOps = [
  { icon: Home, label: 'Landing', href: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: LayoutGrid, label: 'Academia', href: '/admin#academy' },
  { icon: ShieldCheck, label: 'Equipo', href: '/admin#team' },
  { icon: GraduationCap, label: 'Clases', href: '/admin#classes' },
  { icon: UsersRound, label: 'Familias', href: '/admin#families' },
  { icon: Users, label: 'Interesados', href: '/admin#leads' },
  { icon: BarChart3, label: 'Pipeline', href: '/admin/pipeline' },
  { icon: MessageSquare, label: 'Feedback', href: '/admin#feedback' },
  { icon: CalendarClock, label: 'Seguimientos', href: '/admin#seguimientos' },
  { icon: Inbox, label: 'Mensajes', href: '/admin/messages' },
  { icon: Sparkles, label: 'Mejoras', href: '#mejoras-chat' },
  { icon: ClipboardList, label: 'Pedidos Opsly', href: '/admin/change-requests' },
  { icon: Settings, label: 'Configuración', href: '/admin/settings' },
  { icon: Bell, label: 'Notificaciones', href: '/settings/notifications' },
] satisfies NavItem[];

function resolveAdminSection(hashValue: string): string {
  const raw = hashValue.replace(/^#/, '').trim();
  if (!raw) return 'inicio';
  return HASH_SECTION_ALIASES[raw] ?? raw;
}
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (pathname !== '/admin' || !hash) return;
    const section = resolveAdminSection(hash);
    const timer = window.setTimeout(() => {
      const target = document.querySelector(`[data-admin-section="${section}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hash, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, hash]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

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
      const logoutResponse = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!logoutResponse.ok) {
        throw new Error('logout_failed');
      }
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error && !error.message.toLowerCase().includes('session')) {
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

    if (item.label === 'Mejoras') {
      return false;
    }

    if (item.label === 'Pedidos Opsly') {
      return pathname.startsWith('/admin/change-requests');
    }

    if (item.label === 'Pipeline') {
      return pathname.startsWith('/admin/pipeline');
    }

    if (item.label === 'Notificaciones') {
      return pathname.startsWith('/settings/notifications');
    }

    if (pathname.startsWith('/admin/interesados')) {
      return item.label === 'Interesados';
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

    if (item.label === 'Familias') {
      return hash === '#families';
    }

    if (item.label === 'Interesados') {
      return hash === '#leads' || hash === '#interesados' || pathname.startsWith('/admin/interesados');
    }

    if (item.label === 'Feedback') {
      return hash === '#feedback';
    }

    if (item.label === 'Seguimientos') {
      return hash === '#seguimientos' || hash === '#follow-up';
    }

    return false;
  };

  const renderNavLinks = (onNavigate?: () => void): React.ReactElement => (
    <>
      <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
        Panel
      </p>
      {navOps.map((item) => {
        const showBadge = item.label === 'Mensajes' && unreadMessages > 0;

        if (item.label === 'Mejoras') {
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                dispatchOpenImprovementChat();
                onNavigate?.();
              }}
              className={cn(
                'pk-focus mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors',
                'text-white/72 hover:bg-white/7 hover:text-white'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive(item) ? 'page' : undefined}
            className={cn(
              'pk-focus mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors',
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
    </>
  );

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-pk-bg">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-pk-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-pk-ink focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r border-white/8 bg-[#11253d] text-white md:flex">
        <div className="shrink-0 border-b border-white/10 px-5 py-5">
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

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{renderNavLinks()}</nav>
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Cerrar menú"
            onClick={() => {
              setMobileNavOpen(false);
              menuButtonRef.current?.focus();
            }}
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col bg-[#11253d] text-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Navegación admin"
            id="admin-mobile-nav"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <PeskidsLogo size={28} />
                <div>
                  <p className="text-sm font-semibold">Peskids</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                    Admin
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 min-w-11 text-white hover:bg-white/10"
                onClick={() => {
                  setMobileNavOpen(false);
                  menuButtonRef.current?.focus();
                }}
                aria-label="Cerrar navegación"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menú móvil">
              {renderNavLinks(() => setMobileNavOpen(false))}
            </nav>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-pk-border bg-pk-surface/95 px-5 py-3 backdrop-blur-sm sm:px-7">
          <div className="flex items-center gap-3 md:hidden">
            <Button
              ref={menuButtonRef}
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 min-w-11"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileNavOpen}
              aria-controls="admin-mobile-nav"
            >
              <span className="flex h-4 w-4 flex-col justify-center gap-0.5" aria-hidden>
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
                <span className="h-0.5 w-full rounded-full bg-current" />
              </span>
            </Button>
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
              <Button
                variant="secondary"
                size="sm"
                className="min-h-11 min-w-11"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label={refreshing ? 'Actualizando panel' : 'Actualizar panel'}
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
              </Button>
            ) : null}
            <RoleSwitcher />
            <NotificationBell />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="ml-1 hidden sm:inline">Cerrar sesión</span>
            </Button>
            <Link href="/" className="pk-focus rounded-xl" aria-label="Ir a la landing">
              <Button variant="ghost" size="sm" className="min-h-11 min-w-11" tabIndex={-1}>
                <Home className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </header>

        {signOutError ? (
          <p className="border-b border-red-100 bg-red-50/20 px-5 py-2 text-center text-xs text-red-800/80 sm:px-7">
            {signOutError}
          </p>
        ) : null}

        <CapacityAlertBanner />

        <main id="admin-main" className="min-h-0 flex-1 overflow-auto p-5 sm:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
      <ImprovementChatPopup />
    </div>
  );
}
