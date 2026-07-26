'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MessageRole = 'staff' | 'assistant';
type MessageCategory =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'security'
  | 'billing'
  | 'question'
  | 'other'
  | null;

interface ImprovementMessage {
  id: string;
  role: MessageRole;
  author_email: string | null;
  body: string;
  category: MessageCategory;
  priority: 'alta' | 'media' | 'baja' | null;
  ai_summary: string | null;
  twenty_task_id: string | null;
  status: string;
  created_at: string;
}

const CATEGORY_LABEL: Record<Exclude<MessageCategory, null>, string> = {
  bug: 'Bug',
  feature: 'Nueva funcionalidad',
  improvement: 'Mejora',
  security: 'Seguridad',
  billing: 'Facturación',
  question: 'Pregunta',
  other: 'Otro',
};

function categoryTone(category: MessageCategory): 'coral' | 'teal' | 'violet' | 'amber' | 'neutral' {
  switch (category) {
    case 'bug':
    case 'security':
      return 'coral';
    case 'feature':
    case 'improvement':
      return 'teal';
    case 'billing':
      return 'amber';
    case 'question':
      return 'violet';
    default:
      return 'neutral';
  }
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso)
  );
}

interface ImprovementChatPanelProps {
  /** Hide the page-style header when embedded in the floating popup. */
  compact?: boolean;
}

export function ImprovementChatPanel({
  compact = false,
}: ImprovementChatPanelProps): React.ReactElement {
  const [messages, setMessages] = useState<ImprovementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/admin/improvement-chat', { credentials: 'include' });
        if (res.status === 404) {
          setDisabled(true);
          return;
        }
        if (!res.ok) throw new Error('load_failed');
        const json = (await res.json()) as { messages?: ImprovementMessage[] };
        setMessages(json.messages ?? []);
      } catch {
        setError('No se pudo cargar el historial de mejoras.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (): Promise<void> => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/improvement-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = (await res.json()) as {
        error?: string;
        staffMessage?: ImprovementMessage;
        assistantMessage?: ImprovementMessage;
      };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo enviar el mensaje');
      }
      setMessages((prev) => [
        ...prev,
        ...(json.staffMessage ? [json.staffMessage] : []),
        ...(json.assistantMessage ? [json.assistantMessage] : []),
      ]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  if (disabled) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pk-primary/10">
          <Sparkles className="h-8 w-8 text-pk-primary" aria-hidden />
        </div>
        <h2 className="text-base font-semibold text-pk-ink">Chat de mejoras desactivado</h2>
        <p className="max-w-xs text-sm text-pk-sub">
          Actívalo con la variable <code className="font-mono">PESKIDS_STAFF_IMPROVEMENT_CHAT_ENABLED</code>{' '}
          en Doppler cuando el equipo esté listo para usarlo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {!compact ? (
        <header className="flex items-center gap-2 border-b border-pk-border px-4 py-4">
          <Sparkles className="h-5 w-5 shrink-0 text-pk-primary" aria-hidden />
          <div>
            <h1 className="text-base font-semibold text-pk-ink">Canal directo con Opsly</h1>
            <p className="text-xs text-pk-sub">
              Usa este chat solo para pedirnos cambios, mejoras o reportar errores de la plataforma.
              Nosotros lo leemos, lo priorizamos y lo ejecutamos.
            </p>
          </div>
        </header>
      ) : (
        <div className="space-y-1 border-b border-pk-border bg-teal-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-pk-ink">Este chat es para pedirnos cambios</p>
          <p className="text-xs leading-relaxed text-pk-sub">
            Escríbenos aquí las mejoras, errores o ajustes que necesiten en Peskids. El equipo de
            Opsly lo recibe, lo clasifica y lo pone en ejecución. No es el inbox de familias ni
            WhatsApp de padres.
          </p>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-pk-sub">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Cargando…
          </div>
        ) : messages.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <p className="text-sm font-medium text-pk-ink">Empieza cuando veas algo que cambiar</p>
            <p className="mx-auto max-w-sm text-sm leading-relaxed text-pk-sub">
              Ejemplo: “en Interesados no se ve el teléfono” o “queremos un filtro por sede”. Cada
              mensaje nos llega para mapearlo y ejecutarlo.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex flex-col gap-1', message.role === 'staff' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  message.role === 'staff'
                    ? 'bg-pk-primary text-white'
                    : 'border border-pk-border bg-white text-pk-ink'
                )}
              >
                {message.body}
              </div>
              <div className="flex items-center gap-2 px-1 text-[11px] text-pk-mutedText">
                <span>{formatTime(message.created_at)}</span>
                {message.category ? (
                  <Badge tone={categoryTone(message.category)}>{CATEGORY_LABEL[message.category]}</Badge>
                ) : null}
                {message.twenty_task_id ? <Badge tone="green">Tarea creada en Twenty</Badge> : null}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error ? <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</p> : null}

      <div className="border-t border-pk-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={2}
            placeholder="Ej: necesitamos filtrar interesados por sede / el botón de WhatsApp no abre…"
            className="pk-input w-full resize-none text-sm"
            disabled={sending}
          />
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0"
            disabled={sending || draft.trim().length === 0}
            onClick={() => void handleSend()}
            aria-label="Enviar pedido de mejora a Opsly"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
