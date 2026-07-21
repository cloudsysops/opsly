'use client';

import { ExternalLink, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  deriveWacrmLeadInboxSnapshot,
  type WacrmMessageRow,
} from '@/lib/integrations/wacrm-inbox-status';
import {
  buildWacrmConversationUrl,
  buildWhatsAppDeepLink,
} from '@/lib/integrations/wacrm-admin-links';

type WacrmLeadInboxActionsProps = {
  phone: string | null | undefined;
  messages: WacrmMessageRow[];
};

/**
 * WhatsApp actions for a lead. WACRM chrome only appears when there is a real
 * WACRM conversation — avoids “apagado / sin conversación” noise in demos.
 */
export function WacrmLeadInboxActions({
  phone,
  messages,
}: WacrmLeadInboxActionsProps): React.ReactElement | null {
  const snapshot = deriveWacrmLeadInboxSnapshot(phone, messages);
  const whatsappUrl = phone ? buildWhatsAppDeepLink(phone) : null;
  const wacrmUrl = snapshot.isWacrm ? buildWacrmConversationUrl(null) : null;

  if (!snapshot.isWacrm) {
    if (!whatsappUrl) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
        >
          Abrir WhatsApp
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="green">WhatsApp canal</Badge>
        <Badge tone={snapshot.status === 'pending_reply' ? 'amber' : 'neutral'}>
          {snapshot.statusLabel}
        </Badge>
        {snapshot.lastMessageAt ? (
          <span className="text-[11px] text-pk-sub">
            Último: {new Date(snapshot.lastMessageAt).toLocaleString('es-CO')}
          </span>
        ) : null}
      </div>
      {snapshot.lastMessagePreview ? (
        <p className="rounded-xl border border-dashed border-pk-border bg-white/70 px-3 py-2 text-xs text-pk-sub">
          {snapshot.lastMessagePreview.length > 120
            ? `${snapshot.lastMessagePreview.slice(0, 120)}…`
            : snapshot.lastMessagePreview}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {whatsappUrl ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
          >
            Abrir WhatsApp
          </Button>
        ) : null}
        {wacrmUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => window.open(wacrmUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            <span className="ml-1">Abrir conversación</span>
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" disabled>
          <MessageSquare className="h-4 w-4" aria-hidden />
          <span className="ml-1">Inbox canal</span>
        </Button>
      </div>
    </div>
  );
}
