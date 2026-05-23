'use client'

import type { ReactNode } from 'react'
import { PeskidsChatProvider } from '@/components/chat/peskids-chat-provider'
import { PeskidsChatWidget } from '@/components/chat/peskids-chat-widget'
import { WhatsAppFloatingButton } from '@/components/contact/whatsapp-floating-button'

export function PeskidsClientShell({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <PeskidsChatProvider>
      {children}
      <PeskidsChatWidget />
      <WhatsAppFloatingButton />
    </PeskidsChatProvider>
  )
}
