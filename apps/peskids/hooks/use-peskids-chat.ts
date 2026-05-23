'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { getOrCreateChatSessionId } from '@/lib/peskids-chat-session'

export type PeskidsChatMessage = {
  role: 'user' | 'assistant'
  text: string
  fromLlm?: boolean
  stage?: 'collecting' | 'handoff'
  progress?: number
}

const WELCOME: PeskidsChatMessage = {
  role: 'assistant',
  text: '¡Hola! Soy el asistente de Peskids 🐠 Te ayudo a reservar una clase de prueba. ¿Cómo te llamas y qué edad tiene tu hijo o hija?',
}

export function usePeskidsChat(): {
  messages: PeskidsChatMessage[]
  input: string
  setInput: (value: string) => void
  sending: boolean
  sendMessage: () => Promise<void>
  listRef: RefObject<HTMLDivElement | null>
} {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<PeskidsChatMessage[]>([WELCOME])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: getOrCreateChatSessionId(),
        }),
      })
      const data = (await res.json()) as {
        reply?: string
        disclaimer?: string
        from_llm?: boolean
        stage?: 'collecting' | 'handoff'
        progress?: number
        error?: string
      }

      if (!res.ok || !data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'No pude responder ahora. Escríbenos por WhatsApp y te ayudamos enseguida.',
          },
        ])
        return
      }

      const suffix = data.disclaimer ? `\n\n_${data.disclaimer}_` : ''
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `${data.reply}${suffix}`,
          fromLlm: data.from_llm,
          stage: data.stage,
          progress: data.progress,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Error de conexión. Intenta de nuevo o contáctanos por WhatsApp.',
        },
      ])
    } finally {
      setSending(false)
    }
  }, [input, sending])

  return { messages, input, setInput, sending, sendMessage, listRef }
}
