'use client';

import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { conversationLabel, statusLabel, statusTone } from './message-inbox-utils';

interface MessageReplyComposerProps {
  active: boolean;
  loading: boolean;
  sending: boolean;
  replyText: string;
  threadState: string | null;
  threadMode: 'admissions' | 'support' | null;
  onReplyChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

export function MessageReplyComposer({
  active,
  loading,
  sending,
  replyText,
  threadState,
  threadMode,
  onReplyChange,
  onSend,
  onCancel,
}: MessageReplyComposerProps): React.ReactElement | null {
  if (!active) {
    return null;
  }

  return (
    <div className="rounded-xl border border-pk-border bg-pk-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-pk-sub">
          Respuesta editable. La IA propone un borrador; tu decides que sale.
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
          <Loader2 className="h-3 w-3 animate-spin" /> Cargando borrador...
        </p>
      ) : (
        <textarea
          value={replyText}
          onChange={(event) => onReplyChange(event.target.value)}
          rows={4}
          className="pk-input w-full text-sm"
          placeholder="Escribe la respuesta aprobada..."
        />
      )}
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={sending || loading || !replyText.trim()}
          onClick={onSend}
        >
          {sending ? 'Enviando...' : 'Aprobar y enviar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
