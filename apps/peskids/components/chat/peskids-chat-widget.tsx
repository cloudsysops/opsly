'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  fromLlm?: boolean
}

const SESSION_KEY = 'peskids_chat_session_id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'web-ssr'
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function PeskidsChatWidget(): React.ReactElement | null {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: '¡Hola! Soy el asistente de Peskids 🐠 Clases en sede Llanogrande o a domicilio. Pregúntame por edades, barrios o cómo agendar una prueba.',
    },
  ])
  const listRef = useRef<HTMLDivElement>(null)

  const isAdmin = pathname?.startsWith('/admin') ?? false

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open])

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
          session_id: getOrCreateSessionId(),
        }),
      })
      const data = (await res.json()) as {
        reply?: string
        disclaimer?: string
        from_llm?: boolean
        error?: string
      }

      if (!res.ok || !data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'No pude responder ahora. Escríbenos por WhatsApp o deja tus datos en el formulario.',
          },
        ])
        return
      }

      const suffix = data.disclaimer ? `\n\n_${data.disclaimer}_` : ''
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `${data.reply}${suffix}`, fromLlm: data.from_llm },
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

  if (isAdmin) return null

  return (
    <>
      {open ? (
        <div
          className="fixed bottom-24 left-4 z-40 flex h-[min(380px,65vh)] w-[min(340px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-pk-border bg-white shadow-lg"
          role="dialog"
          aria-label="Chat Peskids"
        >
          <header className="flex items-center justify-between bg-pk-primary px-4 py-3 text-white">
            <div>
              <p className="font-display text-sm font-bold">Peskids</p>
              <p className="text-[11px] opacity-90">Asistente · respuesta orientativa</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-white/15"
              aria-label="Cerrar chat"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-pk-primary text-white'
                      : 'bg-pk-muted text-pk-ink'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            ))}
            {sending ? (
              <p className="text-xs text-pk-sub animate-pulse">Escribiendo…</p>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-pk-border p-3"
            onSubmit={(e) => {
              e.preventDefault()
              void sendMessage()
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="pk-input flex-1 text-sm"
              disabled={sending}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pk-primary text-white disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 left-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-pk-border bg-pk-surface text-pk-teal shadow-md transition hover:bg-pk-muted sm:bottom-8"
        aria-expanded={open}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat Peskids'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  )
}
