'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, Wifi } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import type { Database } from '@/lib/types';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface ThreadApiResponse {
  messages?: MessageRow[];
  contact?: string;
  error?: string;
}

interface SendApiResponse {
  message?: MessageRow;
  error?: string;
}

interface MessageThreadProps {
  contact: string;
}

function sourceLabel(source: 'whatsapp' | 'instagram' | 'web'): string {
  if (source === 'whatsapp') return 'WhatsApp';
  if (source === 'instagram') return 'Instagram';
  return 'Web';
}

function sourceTone(source: 'whatsapp' | 'instagram' | 'web'): 'green' | 'coral' | 'teal' {
  if (source === 'whatsapp') return 'green';
  if (source === 'instagram') return 'coral';
  return 'teal';
}

export function MessageThread({ contact }: MessageThreadProps): React.ReactElement {
  const [messages, setMessages] = useState<MessageRow[]>([]);
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
    if (!contact) return;
    try {
      const encoded = encodeURIComponent(contact);
      const res = await fetch(`/api/admin/messages/${encoded}?limit=50`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ThreadApiResponse;
      if (!res.ok) throw new Error(data.error ?? 'Failed to load thread');
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
  }, [contact]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setError('');
    setInput('');
    void loadMessages();
  }, [contact, loadMessages]);

  // Realtime subscription on messages table
  useEffect(() => {
    if (!canSubscribe || !contact) return undefined;

    const supabase = createClient();
    const channel = supabase
      .channel(`staff-thread-${contact}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (_payload) => {
          void loadMessages();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [canSubscribe, contact, loadMessages]);

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
    const optimistic: MessageRow = {
      id: tempId,
      tenant_id: 'peskids',
      franchise_id: null,
      source: 'web',
      sender_name: 'Tú',
      sender_contact: 'staff:optimistic',
      message_text: text,
      direction: 'outbound',
      status: 'sent',
      ai_generated: false,
      external_id: contact,
      parent_message_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setOptimisticIds((prev) => new Set([...prev, tempId]));
    setInput('');
    setSending(true);
    setError('');

    try {
      const encoded = encodeURIComponent(contact);
      const res = await fetch(`/api/admin/messages/${encoded}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = (await res.json().catch(() => ({}))) as SendApiResponse;
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el mensaje');

      await loadMessages();
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    } catch (err) {
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
  }, [contact, input, loadMessages, sending]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando conversación…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <header className="flex items-center justify-between gap-3 border-b border-pk-border px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-pk-ink">{contact}</p>
          <p className="text-xs text-pk-sub">{messages.length} mensajes</p>
        </div>
        {canSubscribe ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600">
            <Wifi className="h-3 w-3" aria-hidden />
            En vivo
          </span>
        ) : null}
      </header>

      {/* Messages */}
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-pk-border bg-pk-snow px-4 py-8 text-center text-sm text-pk-sub">
            No hay mensajes en esta conversación aún.
          </p>
        ) : null}

        {messages.map((msg) => {
          const isStaff = msg.sender_contact.startsWith('staff:');
          const isOptimistic = optimisticIds.has(msg.id);
          const label = sourceLabel(msg.source);
          const tone = sourceTone(msg.source);

          return (
            <div
              key={msg.id}
              className={cn('flex', isStaff ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm transition-opacity',
                  isStaff
                    ? 'rounded-br-md bg-pk-primary text-white'
                    : 'rounded-bl-md border border-pk-border bg-pk-muted/35 text-pk-ink',
                  isOptimistic && 'opacity-70'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] opacity-80">
                  <span>
                    {isStaff
                      ? (msg.sender_name ?? 'Equipo Peskids')
                      : (msg.sender_name ?? 'Familia')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isStaff ? (
                      <Badge tone={tone} className="normal-case tracking-normal">
                        {label}
                      </Badge>
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

      {/* Composer */}
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
            placeholder={`Responder a ${contact}…`}
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
      </footer>
    </div>
  );
}
