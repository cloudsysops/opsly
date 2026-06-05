'use client';

import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from './notification-types';

interface NotificationPanelProps {
  notifications: Notification[];
  loading: boolean;
  markingRead: boolean;
  onMarkAllRead: () => void;
  onClose: () => void;
}

function formatRelative(dateString: string): string {
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${days} d`;
  } catch {
    return '';
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function NotificationPanel({
  notifications,
  loading,
  markingRead,
  onMarkAllRead,
  onClose,
}: NotificationPanelProps): React.ReactElement {
  const unread = notifications.filter((n) => n.read_at === null);
  const hasUnread = unread.length > 0;

  return (
    // Overlay trap — close on backdrop click
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="presentation"
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        className={cn(
          'absolute right-4 top-[68px] z-50 w-80 sm:w-96',
          'rounded-2xl border border-pk-border bg-pk-surface shadow-card-hover',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notificaciones"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-pk-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-pk-primary" aria-hidden />
            <h2 className="text-sm font-bold text-pk-ink">Notificaciones</h2>
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={markingRead}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
                'text-xs font-semibold text-pk-primary transition-colors',
                'hover:bg-pk-muted disabled:opacity-50'
              )}
            >
              {markingRead ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <CheckCheck className="h-3 w-3" aria-hidden />
              )}
              Marcar todo como leído
            </button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[420px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-pk-mutedText">
              <Loader2 className="h-4 w-4 animate-spin text-pk-primary" aria-hidden />
              Cargando…
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto mb-2 h-6 w-6 text-pk-border" aria-hidden />
              <p className="text-sm text-pk-mutedText">Sin notificaciones nuevas</p>
            </div>
          ) : (
            <ul role="list" className="divide-y divide-pk-border/60">
              {notifications.map((notification) => {
                const isUnread = notification.read_at === null;
                return (
                  <li
                    key={notification.id}
                    className={cn(
                      'flex gap-3 px-4 py-3 transition-colors',
                      isUnread ? 'bg-pk-snow' : 'bg-pk-surface'
                    )}
                  >
                    {/* Unread indicator */}
                    <div className="mt-1.5 shrink-0">
                      <span
                        className={cn(
                          'block h-2 w-2 rounded-full',
                          isUnread ? 'bg-pk-primary' : 'bg-transparent'
                        )}
                        aria-hidden
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-sm leading-snug',
                          isUnread ? 'font-semibold text-pk-ink' : 'font-medium text-pk-sub'
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-pk-mutedText">
                        {truncate(notification.body, 60)}
                      </p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-pk-border">
                        {formatRelative(notification.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-pk-border px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onClose}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
