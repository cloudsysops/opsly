'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import { NotificationPanel } from './notification-panel';
import type { Notification, NotificationsResponse, UnreadCountResponse, MarkReadResponse } from './notification-types';

const POLL_INTERVAL_MS = 30_000;
const MAX_DISPLAYED = 10;

const canSubscribeToRealtime =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

export function NotificationBell(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  // Track whether the panel data has been loaded at least once
  const listLoadedRef = useRef(false);

  // --- Fetch unread count only (lightweight, runs on interval) ---
  const fetchUnreadCount = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as UnreadCountResponse;
      setUnreadCount(data.count ?? 0);
    } catch {
      // Graceful: ignore network errors, keep last known count
    }
  }, []);

  // --- Fetch full notification list (only when panel is open) ---
  const fetchNotifications = useCallback(async (): Promise<void> => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsResponse;
      const list = Array.isArray(data.notifications) ? data.notifications : [];
      setNotifications(list.slice(0, MAX_DISPLAYED));
      setUnreadCount(data.unread ?? 0);
    } catch {
      // Graceful: keep last known list
    } finally {
      setLoadingList(false);
      listLoadedRef.current = true;
    }
  }, []);

  // --- Mark all unread as read ---
  const handleMarkAllRead = useCallback(async (): Promise<void> => {
    const unreadIds = notifications.filter((n) => n.read_at === null).map((n) => n.id);
    if (unreadIds.length === 0) return;

    setMarkingRead(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds, read: true }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as MarkReadResponse;
      if (data.updated > 0) {
        // Optimistically mark notifications as read in local state
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: now } : n))
        );
        setUnreadCount(0);
      }
    } catch {
      // Graceful: let the user retry
    } finally {
      setMarkingRead(false);
    }
  }, [notifications]);

  // --- Poll unread count every 30s ---
  useEffect(() => {
    void fetchUnreadCount();
    const timer = window.setInterval(() => {
      void fetchUnreadCount();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchUnreadCount]);

  // --- Load full list when panel opens ---
  useEffect(() => {
    if (open) {
      void fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // --- Supabase realtime: listen for new notifications ---
  useEffect(() => {
    if (!canSubscribeToRealtime) return undefined;

    const supabase = createClient();

    // We don't know the user_id here without an async call, so we subscribe
    // to a general notifications channel and refresh the count on any change.
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          void fetchUnreadCount();
          // Also refresh the list if the panel is open
          if (open) {
            void fetchNotifications();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, fetchUnreadCount, fetchNotifications]);

  const badgeCount = unreadCount > 99 ? '99+' : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <>
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificaciones sin leer`
            : 'Notificaciones'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-xl',
          'text-pk-sub transition-colors',
          'hover:bg-pk-muted hover:text-pk-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pk-primary/40',
          open && 'bg-pk-muted text-pk-ink'
        )}
      >
        <Bell className="h-5 w-5" aria-hidden />

        {/* Unread badge */}
        {badgeCount !== null && (
          <span
            aria-hidden
            className={cn(
              'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center',
              'rounded-full bg-pk-accent px-1 py-px',
              'font-mono text-[10px] font-bold leading-none text-white shadow-sm'
            )}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          loading={loadingList && !listLoadedRef.current}
          markingRead={markingRead}
          onMarkAllRead={() => void handleMarkAllRead()}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
