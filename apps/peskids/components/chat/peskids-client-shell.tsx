'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { PeskidsChatProvider } from '@/components/chat/peskids-chat-provider'
import { PeskidsFloatingChatDock } from '@/components/chat/peskids-floating-chat-dock'
import { WhatsAppFloatingButton } from '@/components/contact/whatsapp-floating-button'
import { PESKIDS_CHAT_OPEN_EVENT } from '@/lib/peskids-chat-session'
import { getPeskidsChatMode } from '@/lib/peskids-surface'

export function PeskidsClientShell({ children }: { children: ReactNode }): React.ReactElement {
  const [chatOpen, setChatOpen] = useState(false)
  const pathname = usePathname()
  const mode = getPeskidsChatMode(pathname)
  const chatMode = mode ?? 'admissions'

  useEffect(() => {
    const openChat = (): void => setChatOpen(true)
    window.addEventListener(PESKIDS_CHAT_OPEN_EVENT, openChat)
    return () => window.removeEventListener(PESKIDS_CHAT_OPEN_EVENT, openChat)
  }, [])

  return (
    <PeskidsChatProvider mode={chatMode}>
      {children}
      {mode ? <PeskidsFloatingChatDock open={chatOpen} onClose={() => setChatOpen(false)} /> : null}
      {mode ? <WhatsAppFloatingButton /> : null}
    </PeskidsChatProvider>
  )
}
