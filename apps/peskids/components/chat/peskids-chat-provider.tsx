'use client'

import { createContext, useContext } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import { usePeskidsChat, type PeskidsChatMessage } from '@/hooks/use-peskids-chat'

type PeskidsChatContextValue = {
  messages: PeskidsChatMessage[]
  input: string
  setInput: (value: string) => void
  sending: boolean
  sendMessage: () => Promise<void>
  listRef: RefObject<HTMLDivElement | null>
}

const PeskidsChatContext = createContext<PeskidsChatContextValue | null>(null)

export function PeskidsChatProvider({ children }: { children: ReactNode }): ReactElement {
  const chat = usePeskidsChat()
  return <PeskidsChatContext.Provider value={chat}>{children}</PeskidsChatContext.Provider>
}

export function usePeskidsChatContext(): PeskidsChatContextValue {
  const ctx = useContext(PeskidsChatContext)
  if (!ctx) {
    throw new Error('usePeskidsChatContext must be used within PeskidsChatProvider')
  }
  return ctx
}
