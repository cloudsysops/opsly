'use client';

import { useEffect, useRef, useState } from 'react';
import { ClipboardList, Loader2, Send, Sparkles, X } from 'lucide-react';
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

type ChatAttachment = {
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_path?: string | null;
  content_base64?: string | null;
};

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
  attachments?: ChatAttachment[] | null;
  created_at: string;
}

type PendingAttachment = {
  name: string;
  mime_type: string;
  size_bytes: number;
  content_base64: string;
  previewUrl?: string;
};

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] ?? '' : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

interface ImprovementChatPanelProps {
  compact?: boolean;
}

export function ImprovementChatPanel({
  compact = false,
}: ImprovementChatPanelProps): React.ReactElement {
  const [messages, setMessages] = useState<ImprovementMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePickFiles = async (fileList: FileList | null): Promise<void> => {
    if (!fileList || fileList.length === 0) return;
    setError('');
    const next: PendingAttachment[] = [...pendingFiles];
    for (const file of Array.from(fileList)) {
      if (next.length >= 4) break;
      const mime = file.type || 'application/octet-stream';
      if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/i.test(mime)) {
        setError('Solo imágenes (JPG/PNG/WebP/GIF) o PDF. Máx. 2.5 MB c/u.');
        continue;
      }
      if (file.size > 2_500_000) {
        setError(`“${file.name}” supera 2.5 MB.`);
        continue;
      }
      const content_base64 = await fileToBase64(file);
      next.push({
        name: file.name,
        mime_type: mime,
        size_bytes: file.size,
        content_base64,
        previewUrl: mime.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      });
    }
    setPendingFiles(next);
  };

  const handleSend = async (): Promise<void> => {
    const body = draft.trim();
    if ((!body && pendingFiles.length === 0) || sending) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/improvement-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          attachments: pendingFiles.map(({ name, mime_type, size_bytes, content_base64 }) => ({
            name,
            mime_type,
            size_bytes,
            content_base64,
          })),
        }),
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
      setPendingFiles([]);
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
              Pide cambios, adjunta capturas de chats con familias o PDF/Excel de referencia.
            </p>
          </div>
        </header>
      ) : (
        <div className="space-y-1 border-b border-pk-border bg-teal-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-pk-ink">Este chat es para pedirnos cambios</p>
          <p className="text-xs leading-relaxed text-pk-sub">
            Pueden escribir mejoras y adjuntar imágenes o PDF (por ejemplo chats de muestra con
            clientes). Nosotros lo revisamos y lo ejecutamos.
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
              Ejemplo: “queremos este flujo de WhatsApp” + captura, o “esta es nuestra base en PDF”.
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
                  'max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                  message.role === 'staff'
                    ? 'bg-pk-primary text-white'
                    : 'border border-pk-border bg-white text-pk-ink'
                )}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                {message.attachments && message.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {message.attachments.map((file) => {
                      const inlineSrc =
                        file.content_base64 && file.mime_type.startsWith('image/')
                          ? `data:${file.mime_type};base64,${file.content_base64}`
                          : null;
                      return (
                        <div
                          key={`${message.id}-${file.name}`}
                          className={cn(
                            'overflow-hidden rounded-lg border text-[11px]',
                            message.role === 'staff' ? 'border-white/30' : 'border-pk-border'
                          )}
                        >
                          {inlineSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={inlineSrc} alt={file.name} className="max-h-40 max-w-[220px] object-cover" />
                          ) : (
                            <p className="px-2 py-1.5">{file.name}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
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
        {pendingFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((file) => (
              <div
                key={`${file.name}-${file.size_bytes}`}
                className="flex items-center gap-1 rounded-full border border-pk-border bg-pk-muted px-2 py-1 text-[11px] text-pk-ink"
              >
                <span className="max-w-[140px] truncate">{file.name}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-white"
                  aria-label={`Quitar ${file.name}`}
                  onClick={() =>
                    setPendingFiles((prev) => prev.filter((item) => item.content_base64 !== file.content_base64))
                  }
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              void handlePickFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-10 shrink-0"
            disabled={sending || pendingFiles.length >= 4}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Adjuntar imagen o PDF"
            title="Adjuntar captura de chat, imagen o PDF"
          >
                  <ClipboardList className="h-4 w-4" />
          </Button>
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
            placeholder="Describe el cambio… o adjunta una captura de chat con familias"
            className="pk-input w-full resize-none text-sm"
            disabled={sending}
          />
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0"
            disabled={sending || (draft.trim().length === 0 && pendingFiles.length === 0)}
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
