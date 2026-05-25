'use client'

import type { ReactElement, RefObject } from 'react'
import { PeskidsChatPanel } from '@/components/chat/peskids-chat-panel'
import { usePeskidsChatContext } from '@/components/chat/peskids-chat-provider'

interface PeskidsFloatingChatDockProps {
  open: boolean
  onClose: () => void
}

export function PeskidsFloatingChatDock({
  open,
  onClose,
}: PeskidsFloatingChatDockProps): ReactElement | null {
  const chat = usePeskidsChatContext()

  if (!open) return null

  return (
    <div className="fixed bottom-20 left-4 z-[80] h-[min(520px,72vh)] w-[min(380px,calc(100vw-2rem))] sm:left-6 sm:bottom-6">
      <PeskidsChatPanel
        variant="floating"
        mode={chat.mode}
        messages={chat.messages}
        input={chat.input}
        sending={chat.sending}
        listRef={chat.listRef as RefObject<HTMLDivElement>}
        onInputChange={chat.setInput}
        onSend={() => void chat.sendMessage()}
        onQuickReply={(reply) => void chat.sendMessage(reply.label)}
        onClose={onClose}
        className="h-full"
      />
    </div>
  )
}
