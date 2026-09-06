'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { conversationLabel, statusLabel, statusTone } from './message-inbox-utils';

interface MessageReplyComposerProps {
  active: boolean;
  loading: boolean;
  sending: boolean;
  generating: boolean;
  replyText: string;
  threadState: string | null;
  threadMode: 'admissions' | 'support' | null;
  onReplyChange: (value: string) => void;
  onGenerate: () => void;
  onApprove: () => void;
  onCopy: () => void;
  onMarkSent: () => void;
  onSend: () => void;
  onSkip: () => void;
  onCancel: () => void;
}

export function MessageReplyComposer({
  active,
  loading,
  sending,
  generating,
  replyText,
  threadState,
  threadMode,
  onReplyChange,
  onGenerate,
  onApprove,
  onCopy,
  onMarkSent,
  onSend,
  onSkip,
  onCancel,
}: MessageReplyComposerProps): React.ReactElement | null {
  if (!active) {
    return null;
  }

  const hasText = replyText.trim().length > 0;

  return (
    <div className="rounded-xl border border-pk-border bg-pk-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-pk-sub">
          Revisa el borrador, aprueba o envía manualmente cuando estés listo.
        </p>
        <div className="flex items-center gap-2">
          <Badge tone={threadMode === 'support' ? 'coral' : 'teal'}>
            {conversationLabel(threadMode ?? undefined)}
          </Badge>
          <Badge tone={statusTone[threadState ?? 'pending_approval'] ?? 'neutral'}>
            {statusLabel(threadState)}
          </Badge>
        </div>
      </div>
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-pk-sub">
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando borrador...
        </p>
      ) : (
        <textarea
          value={replyText}
          onChange={(event) => onReplyChange(event.target.value)}
          rows={4}
          className="pk-input w-full text-sm"
          placeholder="Escribe o edita la respuesta..."
        />
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={generating || sending || loading}
          onClick={onGenerate}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {generating ? 'Generando...' : 'Generar respuesta'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={sending || loading || !hasText}
          onClick={onApprove}
        >
          {sending ? 'Guardando...' : 'Aprobar'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading || !hasText}
          onClick={onCopy}
        >
          Copiar mensaje
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={sending || loading || !hasText}
          onClick={onMarkSent}
        >
          Marcar enviado
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={sending || loading || !hasText}
          onClick={onSend}
        >
          {sending ? 'Enviando...' : 'Aprobar y enviar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={sending || loading} onClick={onSkip}>
          Omitir
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
