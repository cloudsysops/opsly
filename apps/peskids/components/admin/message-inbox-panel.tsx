'use client';

import { useCallback, useState } from 'react';
import { Copy, Loader2, Mail, Phone, Reply } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const sourceTone: Record<string, 'green' | 'coral' | 'teal'> = {
  whatsapp: 'green',
  instagram: 'coral',
  web: 'teal',
};

const statusTone: Record<string, 'amber' | 'violet' | 'green' | 'neutral'> = {
  pending: 'amber',
  approved: 'violet',
  sent: 'green',
};

type ThreadResponse = {
  inbound: {
    message_text: string;
    sender_name: string | null;
    sender_contact: string;
    source: string;
    status?: string | null;
  };
  conversation_mode?: 'admissions' | 'support';
  status?: string | null;
  suggested_reply: string | null;
};

function statusLabel(status?: string | null): string {
  if (status === 'sent') return 'Enviado';
  if (status === 'approved') return 'Aprobado';
  return 'Pendiente';
}

function conversationLabel(mode?: string): string {
  if (mode === 'support') return 'Soporte';
  if (mode === 'admissions') return 'Admisión';
  return 'Canal';
}

function normalizeDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

function getContactHref(source: string, contact: string): string | null {
  if (!contact.trim()) return null;
  if (contact.includes('@')) return `mailto:${contact.trim()}`;
  if (source === 'whatsapp') {
    const digits = normalizeDigits(contact);
    return digits ? `https://wa.me/${digits}` : null;
  }
  return null;
}

export function MessageInboxPanel({
  messages,
}: {
  messages: DashboardData['recent_messages'];
}): React.ReactElement {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<string | null>(null);
  const [threadMode, setThreadMode] = useState<'admissions' | 'support' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openThread = useCallback(async (messageId: string) => {
    setActiveId(messageId);
    setLoading(true);
    setStatus(null);
    setThreadMode(null);
    try {
      const res = await fetch(`/api/messages/${messageId}/thread`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ThreadResponse & { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
          return;
        }
        setStatus(data.error ?? 'No se pudo cargar el hilo');
        return;
      }
      setThreadState(data.status ?? data.inbound.status ?? 'pending');
      setThreadMode(data.conversation_mode ?? null);
      setReplyText(data.suggested_reply ?? '');
    } catch {
      setStatus('Error al cargar borrador sugerido');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyMessage = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      window.setTimeout(
        () => setCopiedId((current) => (current === messageId ? null : current)),
        1200
      );
    } catch {
      window.prompt('Copia este texto', text);
    }
  }, []);

  const sendReply = useCallback(async () => {
    if (!activeId || !replyText.trim()) return;

    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
          return;
        }
        setStatus(data.error ?? 'Error al enviar');
        return;
      }
      setStatus(data.message ?? 'Enviado');
      setActiveId(null);
      setReplyText('');
      setThreadState('sent');
      setThreadMode(null);
    } catch {
      setStatus('Error de red al enviar');
    } finally {
      setSending(false);
    }
  }, [activeId, replyText]);

  if (messages.length === 0) {
    return <p className="text-sm text-pk-sub">Sin mensajes entrantes recientes.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-52 space-y-2 overflow-y-auto">
        {messages.map((msg) => {
          const tone = sourceTone[msg.source] ?? 'teal';
          const preview =
            msg.message_text.length > 48 ? `${msg.message_text.slice(0, 48)}…` : msg.message_text;
          return (
            <li key={msg.id}>
              <div
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  activeId === msg.id ? 'border-pk-primary bg-pk-muted/60' : 'border-pk-border/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void openThread(msg.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-pk-ink">
                          {msg.sender_name || msg.sender_contact}
                        </p>
                        <Badge tone={msg.conversation_mode === 'support' ? 'coral' : 'teal'}>
                          {conversationLabel(msg.conversation_mode)}
                        </Badge>
                        <Badge tone={tone}>{msg.source}</Badge>
                        <Badge tone={statusTone[msg.status ?? 'pending'] ?? 'neutral'}>
                          {msg.status === 'sent'
                            ? 'Enviado'
                            : msg.status === 'approved'
                              ? 'Aprobado'
                              : 'Pendiente'}
                        </Badge>
                        {msg.direction ? (
                          <Badge tone="neutral">
                            {msg.direction === 'inbound' ? 'Entrada' : msg.direction}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-pk-sub">{preview}</p>
                    </div>
                    <Reply className="h-3.5 w-3.5 shrink-0 text-pk-primary" aria-hidden />
                  </div>
                </button>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void openThread(msg.id)}
                  >
                    <Reply className="h-4 w-4" aria-hidden />
                    <span className="ml-1">Responder</span>
                  </Button>
                  {getContactHref(msg.source, msg.sender_contact) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const href = getContactHref(msg.source, msg.sender_contact);
                        if (href) window.open(href, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      {msg.source === 'whatsapp' ? (
                        <Phone className="h-4 w-4" aria-hidden />
                      ) : (
                        <Mail className="h-4 w-4" aria-hidden />
                      )}
                      <span className="ml-1">
                        {msg.source === 'whatsapp' ? 'Abrir contacto' : 'Correo'}
                      </span>
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      void copyMessage(
                        msg.id,
                        `${msg.sender_name || msg.sender_contact}\n${msg.message_text}`
                      )
                    }
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    <span className="ml-1">{copiedId === msg.id ? 'Copiado' : 'Copiar'}</span>
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {activeId ? (
        <div className="rounded-xl border border-pk-border bg-pk-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-pk-sub">
              Respuesta editable. La IA propone un borrador; tú decides qué sale.
            </p>
            <div className="flex items-center gap-2">
              <Badge tone={threadMode === 'support' ? 'coral' : 'teal'}>
                {conversationLabel(threadMode ?? undefined)}
              </Badge>
              <Badge tone={statusTone[threadState ?? 'pending'] ?? 'neutral'}>
                {statusLabel(threadState)}
              </Badge>
            </div>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-pk-sub">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando borrador…
            </p>
          ) : (
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="pk-input w-full text-sm"
              placeholder="Escribe la respuesta aprobada…"
            />
          )}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={sending || loading || !replyText.trim()}
              onClick={() => void sendReply()}
            >
              {sending ? 'Enviando…' : 'Aprobar y enviar'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setActiveId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {status ? <p className="text-xs text-pk-sub">{status}</p> : null}
    </div>
  );
}
