'use client';

import { Copy, Mail, Phone, Reply } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  conversationLabel,
  getContactHref,
  isWacrmInboxMessage,
  sourceTone,
  statusLabel,
  statusTone,
  type InboxMessage,
} from './message-inbox-utils';

interface MessageInboxItemProps {
  message: InboxMessage;
  isActive: boolean;
  copied: boolean;
  onOpenThread: (messageId: string) => void;
  onCopyMessage: (messageId: string, text: string) => void;
}

export function MessageInboxItem({
  message,
  isActive,
  copied,
  onOpenThread,
  onCopyMessage,
}: MessageInboxItemProps): React.ReactElement {
  const tone = sourceTone[message.source] ?? 'teal';
  const preview =
    message.message_text.length > 48
      ? `${message.message_text.slice(0, 48)}…`
      : message.message_text;
  const contactHref = getContactHref(message.source, message.sender_contact);

  return (
    <li>
      <div
        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
          isActive ? 'border-pk-primary bg-pk-muted/60' : 'border-pk-border/80'
        }`}
      >
        <button
          type="button"
          onClick={() => onOpenThread(message.id)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-pk-ink">
                  {message.sender_name || message.sender_contact}
                </p>
                <Badge tone={message.conversation_mode === 'support' ? 'coral' : 'teal'}>
                  {conversationLabel(message.conversation_mode)}
                </Badge>
                <Badge tone={tone}>{message.source}</Badge>
                {isWacrmInboxMessage(message) ? <Badge tone="green">wacrm</Badge> : null}
                <Badge tone={statusTone[message.status ?? 'pending'] ?? 'neutral'}>
                  {statusLabel(message.status)}
                </Badge>
                {message.direction ? (
                  <Badge tone="neutral">
                    {message.direction === 'inbound' ? 'Entrada' : message.direction}
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
            onClick={() => onOpenThread(message.id)}
          >
            <Reply className="h-4 w-4" aria-hidden />
            <span className="ml-1">Responder</span>
          </Button>
          {contactHref ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => window.open(contactHref, '_blank', 'noopener,noreferrer')}
            >
              {message.source === 'whatsapp' ? (
                <Phone className="h-4 w-4" aria-hidden />
              ) : (
                <Mail className="h-4 w-4" aria-hidden />
              )}
              <span className="ml-1">
                {message.source === 'whatsapp' ? 'Abrir contacto' : 'Correo'}
              </span>
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              onCopyMessage(
                message.id,
                `${message.sender_name || message.sender_contact}\n${message.message_text}`
              )
            }
          >
            <Copy className="h-4 w-4" aria-hidden />
            <span className="ml-1">{copied ? 'Copiado' : 'Copiar'}</span>
          </Button>
        </div>
      </div>
    </li>
  );
}
