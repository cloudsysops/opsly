'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { PeskidsChatPanel } from '@/components/chat/peskids-chat-panel'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { usePeskidsChatContext } from '@/components/chat/peskids-chat-provider'

/** Hero: chat interactivo en lugar del formulario plano. Ancla #contacto para navegación. */
export function HeroChatCard(): React.ReactElement {
  const chat = usePeskidsChatContext()

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
        <span>Respondemos en horario hábil. También puedes escribir por</span>
        <WhatsAppLink variant="ghost" label="WhatsApp" className="text-xs" showIcon={false} />
      </p>
    </div>
  )
}
