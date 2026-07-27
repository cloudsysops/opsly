'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { PeskidsChatPanel } from '@/components/chat/peskids-chat-panel';
import { usePeskidsChatContext } from '@/components/chat/peskids-chat-provider';
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config';

/** Hero/sección: chat interactivo que guarda lead y luego handoff a WhatsApp humano. */
export function HeroChatCard(): React.ReactElement {
  const chat = usePeskidsChatContext();

  return (
    <div id="contacto" className="scroll-mt-24">
      <PeskidsChatPanel
        variant="inline"
        mode={chat.mode}
        messages={chat.messages}
        input={chat.input}
        sending={chat.sending}
        listRef={chat.listRef as React.RefObject<HTMLDivElement>}
        onInputChange={chat.setInput}
        onSend={() => void chat.sendMessage()}
        onQuickReply={(reply) => void chat.sendMessage(reply.value, reply.label)}
        handoffWhatsAppUrl={chat.handoff?.whatsappUrl}
        handoffWhatsAppLabel={chat.handoff?.whatsappLabel}
        leadSaved={chat.handoff?.leadSaved}
      />
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-pk-mutedText">
        <MessageCircle className="h-3.5 w-3.5 text-pk-primary" aria-hidden />
        <span>Preferimos el chat: guardamos tus datos y te pasamos al WhatsApp correcto.</span>
        <Link
          href={PESKIDS_RESERVATION_FORM_HREF}
          className="font-semibold text-pk-primary underline-offset-2 hover:underline"
        >
          Formulario clásico
        </Link>
      </p>
    </div>
  );
}
