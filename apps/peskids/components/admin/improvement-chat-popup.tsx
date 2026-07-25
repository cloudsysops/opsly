'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { ImprovementChatPanel } from '@/components/admin/improvement-chat-panel';
import { cn } from '@/lib/utils';

export const PESKIDS_IMPROVEMENT_CHAT_OPEN_EVENT = 'peskids:open-improvement-chat';

export function dispatchOpenImprovementChat(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PESKIDS_IMPROVEMENT_CHAT_OPEN_EVENT));
}

/**
 * Floating popup for staff improvement chat — visible on all /admin pages
 * so owners can report bugs/improvements without leaving the current screen.
 */
export function ImprovementChatPopup(): React.ReactElement | null {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const onOpen = (): void => setOpen(true);
    window.addEventListener(PESKIDS_IMPROVEMENT_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PESKIDS_IMPROVEMENT_CHAT_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/improvement-chat', { credentials: 'include' });
        if (cancelled) return;
        if (res.status === 404) {
          setEnabled(false);
          return;
        }
        // 401/403 → hide FAB (not an admin surface session)
        if (res.status === 401 || res.status === 403) {
          setEnabled(false);
          return;
        }
        setEnabled(true);
      } catch {
        if (!cancelled) setEnabled(true);
      }
    };
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const close = useCallback((): void => setOpen(false), []);

  if (!enabled) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-full',
            'bg-pk-primary px-3.5 py-3 text-white shadow-lg sm:bottom-6 sm:right-6 sm:px-5 sm:py-4',
            'transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pk-primary'
          )}
          aria-label="Abrir chat de mejoras"
          title="Reportar mejora o error"
        >
          <Sparkles className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
          <span className="pr-0.5 text-xs font-bold leading-none sm:text-sm">Mejoras</span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-end p-3 sm:items-end sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-pk-ink/40 backdrop-blur-[1px]"
            aria-label="Cerrar chat de mejoras"
            onClick={close}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              'relative z-10 flex w-full flex-col overflow-hidden rounded-2xl border border-pk-border bg-white shadow-2xl',
              'h-[min(72vh,640px)] max-w-md sm:max-w-lg'
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-pk-border bg-pk-snow px-3 py-2.5">
              <p id={titleId} className="text-sm font-semibold text-pk-ink">
                Chat de mejoras
              </p>
              <button
                type="button"
                onClick={close}
                className="pk-focus inline-flex h-9 w-9 items-center justify-center rounded-full text-pk-sub hover:bg-pk-muted hover:text-pk-ink"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ImprovementChatPanel compact />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
