'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, Wifi } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

interface FamilyMessage {
  id: string;
  source: 'whatsapp' | 'instagram' | 'web';
  sender_name: string | null;
  message_text: string;
  direction: 'inbound' | 'draft' | 'outbound';
  status: 'pending' | 'approved' | 'sent' | null;
  created_at: string;
}

interface MessagesApiResponse {
  messages: FamilyMessage[];
  total: number;
  error?: string;
}

interface MessagesSendResponse {
  message?: FamilyMessage;
  error?: string;
}

export function MessagesPanel(): React.ReactElement {
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const canSubscribe =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());

  const loadMessages = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/families/messages?limit=30', { credentials: 'include' });
      const data = (await res.json()) as MessagesApiResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to load messages');
      // Sort oldest-first for chat display
      const sorted = [...(data.messages ?? [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      setMessages(sorted);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los mensajes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!canSubscribe) return undefined;

    const supabase = createClient();
    const channel = supabase
      .channel('family-messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (_payload) => {
          void loadMessages();
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadMessages();
    }, 5000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [canSubscribe, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (): Promise<void> => {
    const text = input.trim();
    if (!text || sending) return;

    // Optimistic update
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: FamilyMessage = {
      id: tempId,
      source: 'web',
      sender_name: 'Tú',
      message_text: text,
      direction: 'inbound',
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setOptimisticIds((prev) => new Set([...prev, tempId]));
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/families/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as MessagesSendResponse;
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el mensaje');

      // Replace optimistic with real
      await loadMessages();
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    } catch (err) {
      // Remove optimistic on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }, [input, loadMessages, sending]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border border-pk-border bg-white p-6 shadow-card">
        <Loader2 className="h-5 w-5 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando mensajes…</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-pk-border bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pk-border px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-pk-primary" aria-hidden />
          <h2 className="text-base font-semibold text-pk-ink">Mensajes con el equipo</h2>
        </div>
        <div className="flex items-center gap-2">
          {canSubscribe ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600">
              <Wifi className="h-3 w-3" aria-hidden />
              En vivo
            </span>
          ) : null}
          <Badge tone="green">Sin WhatsApp</Badge>
        </div>
      </header>

      <div ref={listRef} className="max-h-[480px] space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-pk-border bg-pk-snow px-4 py-8 text-center text-sm text-pk-sub">
            No hay mensajes aún. Envía un mensaje para contactar al equipo.
          </p>
        ) : null}

        {messages.map((msg) => {
          const isFamily = msg.direction === 'inbound';
          const isOptimistic = optimisticIds.has(msg.id);
          const sourceLabel = msg.source === 'whatsapp' ? 'WhatsApp' : null;

          return (
            <div
              key={msg.id}
              className={cn('flex', isFamily ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm transition-opacity',
                  isFamily
                    ? 'rounded-br-md bg-pk-primary text-white'
                    : 'rounded-bl-md border border-pk-border bg-pk-muted/35 text-pk-ink',
                  isOptimistic && 'opacity-70'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] opacity-80">
                  <span>{msg.sender_name ?? (isFamily ? 'Familia' : 'Peskids')}</span>
                  <div className="flex items-center gap-1.5">
                    {sourceLabel ? (
                      <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-wide text-emerald-700">
                        {sourceLabel}
                      </span>
                    ) : null}
                    <span>{formatRelativeTime(new Date(msg.created_at))}</span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-6">{msg.message_text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <footer className="border-t border-pk-border bg-pk-snow/50 p-4">
        {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Escribe un mensaje para el equipo de Peskids…"
            className="pk-input min-h-[44px] flex-1 resize-none"
            rows={2}
            maxLength={2000}
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="sm:w-auto sm:self-end"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            <span className="ml-1">Enviar</span>
          </Button>
        </form>
        <p className="mt-2 text-xs text-pk-sub">
          Los mensajes llegan directamente al equipo. Responderemos pronto.
        </p>
      </footer>
    </section>
  );
}
