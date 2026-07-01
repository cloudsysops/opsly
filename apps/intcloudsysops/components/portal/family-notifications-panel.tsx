'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Check, FileText, MessageSquare, RefreshCw, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface FamilyNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationsApiResponse {
  notifications?: FamilyNotification[];
  error?: string;
}


function notificationIcon(type: string): React.ReactElement {
  if (type === 'observation' || type === 'message') {
    return <MessageSquare className="h-4 w-4 text-pk-primary" aria-hidden />;
  }
  if (type === 'reassigned') {
    return <RefreshCw className="h-4 w-4 text-amber-500" aria-hidden />;
  }
  return <FileText className="h-4 w-4 text-pk-sub" aria-hidden />;
}

export function FamilyNotificationsPanel(): React.ReactElement {
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState('');

  const canSubscribe =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      const data = (await res.json()) as NotificationsApiResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to load notifications');
      setNotifications((data.notifications ?? []).slice(0, 10));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!canSubscribe) return undefined;

    const supabase = createClient();
    const channel = supabase
      .channel('family-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (_payload) => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canSubscribe, loadNotifications]);

  const markAllRead = useCallback(async (): Promise<void> => {
    if (marking) return;
    setMarking(true);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      await loadNotifications();
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  }, [loadNotifications, marking]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-pk-border bg-white p-6 shadow-card">
        <Loader2 className="h-5 w-5 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando notificaciones…</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-pk-border bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pk-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-pk-primary" aria-hidden />
          <h2 className="text-base font-semibold text-pk-ink">Notificaciones</h2>
          {unreadCount > 0 ? (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-pk-primary px-1.5 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void markAllRead()}
            disabled={marking}
            className="h-8 gap-1 text-xs"
          >
            {marking ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3 w-3" aria-hidden />
            )}
            Marcar todo como leído
          </Button>
        ) : null}
      </header>

      <div className="divide-y divide-pk-border">
        {error ? (
          <p className="px-5 py-6 text-sm text-rose-700">{error}</p>
        ) : notifications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-pk-sub">
            No tienes notificaciones por ahora.
          </p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                'flex gap-3 px-5 py-4 transition-colors',
                !notification.read && 'bg-pk-primary/5'
              )}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-pk-border bg-pk-snow">
                {notificationIcon(notification.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-1">
                  <p className={cn('text-sm', !notification.read ? 'font-semibold text-pk-ink' : 'text-pk-sub')}>
                    {notification.title}
                  </p>
                  <div className="flex items-center gap-2">
                    {!notification.read ? <Badge tone="teal">Nuevo</Badge> : null}
                    <span className="text-[11px] text-pk-mutedText">
                      {formatRelativeTime(new Date(notification.created_at))}
                    </span>
                  </div>
                </div>
                {notification.body ? (
                  <p className="mt-1 text-sm leading-5 text-pk-sub">{notification.body}</p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
