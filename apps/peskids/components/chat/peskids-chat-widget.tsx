'use client'

import React, { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { PeskidsChatPanel } from '@/components/chat/peskids-chat-panel'
import { usePeskidsChatContext } from '@/components/chat/peskids-chat-provider'
import { PESKIDS_CHAT_OPEN_EVENT } from '@/lib/peskids-chat-session'
import { cn } from '@/lib/utils'

export function PeskidsChatWidget(): React.ReactElement | null {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const chat = usePeskidsChatContext()

  const isAdmin = pathname?.startsWith('/admin') ?? false
  const isHome = pathname === '/'

  useEffect(() => {
    const onOpen = (): void => setOpen(true)
    window.addEventListener(PESKIDS_CHAT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(PESKIDS_CHAT_OPEN_EVENT, onOpen)
  }, [])

  if (isAdmin || isHome) return null

  return (
    <>
      {open ? (
        <div className="fixed bottom-24 left-4 z-40 h-[min(380px,65vh)] w-[min(340px,calc(100vw-2rem))]">
          <PeskidsChatPanel
            variant="floating"
            messages={chat.messages}
            input={chat.input}
            sending={chat.sending}
            listRef={chat.listRef as React.RefObject<HTMLDivElement>}
            onInputChange={chat.setInput}
            onSend={() => void chat.sendMessage()}
            onClose={() => setOpen(false)}
            className="h-full"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'fixed bottom-6 left-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-pk-border bg-pk-surface text-pk-teal shadow-md transition hover:bg-pk-muted sm:bottom-8',
          isHome && 'lg:hidden'
        )}
        aria-expanded={open}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat Peskids'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  )
}
