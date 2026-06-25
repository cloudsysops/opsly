'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { PeskidsChatPanel } from '@/components/chat/peskids-chat-panel';
import { usePeskidsChatContext } from '@/components/chat/peskids-chat-provider';
import { PESKIDS_RESERVATION_FORM_HREF } from '@/lib/peskids-landing-config';

/** Hero: chat interactivo en lugar del formulario plano. Ancla #contacto para navegación. */
export function HeroChatCard(): React.ReactElement {
  const chat = usePeskidsChatContext();

  return (
    <div id="contacto" className="scroll-mt-24">
      <PeskidsChatPanel
        variant="inline"
        messages={chat.messages}
        input={chat.input}
        sending={chat.sending}
        listRef={chat.listRef as React.RefObject<HTMLDivElement>}
        onInputChange={chat.setInput}
        onSend={() => void chat.sendMessage()}
      />
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-pk-mutedText">
        <MessageCircle className="h-3.5 w-3.5 text-pk-primary" aria-hidden />
        <span>Para reservar clase de prueba, completa primero el</span>
        <Link href={PESKIDS_RESERVATION_FORM_HREF} className="font-semibold text-pk-primary underline-offset-2 hover:underline">
          formulario de reserva
        </Link>
      </p>
    </div>
  );
}
