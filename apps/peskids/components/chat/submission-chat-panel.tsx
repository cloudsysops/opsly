'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase-browser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SubmissionChatMessage = {
  id: string
  message_text: string
  created_at: string
  direction: 'inbound' | 'draft' | 'outbound'
  sender_name: string | null
  sender_contact: string
  status: 'pending' | 'approved' | 'sent' | null
}

type SubmissionChatPayload = {
  submission_id: string
  student_name: string
  parent_email: string
  thread_contact: string
  viewer_role: 'family' | 'staff'
  messages: SubmissionChatMessage[]
}

type SubmissionChatPanelProps = {
  submissionId: string
  title: string
  description: string
  className?: string
  sendLabel?: string
  placeholder?: string
}

export function SubmissionChatPanel({
  submissionId,
  title,
  description,
  className,
  sendLabel = 'Enviar mensaje',
  placeholder = 'Escribe un mensaje para coordinar materiales, horario o cambios...',
}: SubmissionChatPanelProps): React.ReactElement {
  const [messages, setMessages] = useState<SubmissionChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [threadContact, setThreadContact] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const canSubscribe =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())

  const loadMessages = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/submission-chat/${submissionId}`, {
        credentials: 'include',
      })
      const data = (await res.json()) as SubmissionChatPayload & { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo cargar el chat')
      }

      setMessages(data.messages || [])
      setThreadContact(data.thread_contact)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el chat')
    } finally {
      setLoading(false)
    }
  }, [submissionId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!canSubscribe) {
      return undefined
    }

    const supabase = createClient()
    const channel = supabase
      .channel(`submission-chat:${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const next = payload.new as SubmissionChatMessage | null
          if (!next) return
          if (threadContact && next.sender_contact !== threadContact) return
          void loadMessages()
        }
      )
      .subscribe()

    const interval = window.setInterval(() => {
      void loadMessages()
    }, 3000)

    return () => {
      window.clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [canSubscribe, loadMessages, submissionId, threadContact])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async (): Promise<void> => {
    const text = input.trim()
    if (!text || sending) return

    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/submission-chat/${submissionId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo enviar el mensaje')
      }

      setInput('')
      await loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje')
    } finally {
      setSending(false)
    }
  }, [input, loadMessages, sending, submissionId])

  if (loading) {
    return (
      <div className={cn('rounded-3xl border border-pk-border bg-white p-6 shadow-card', className)}>
        <div className="flex items-center gap-3 text-pk-sub">
          <Loader2 className="h-5 w-5 animate-spin text-pk-primary" aria-hidden />
          Cargando chat…
        </div>
      </div>
    )
  }

  return (
    <section className={cn('overflow-hidden rounded-3xl border border-pk-border bg-white shadow-card', className)}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-pk-border px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pk-primary" aria-hidden />
            <h2 className="text-base font-semibold text-pk-ink">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-pk-sub">{description}</p>
        </div>
        <Badge tone="green">Actualización automática</Badge>
      </header>

      <div ref={listRef} className="max-h-[460px] space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-pk-border bg-pk-snow px-4 py-6 text-sm text-pk-sub">
            Aún no hay mensajes. Escribe el primero para coordinar materiales, horarios o cambios.
          </p>
        ) : null}

        {messages.map((message) => {
          const isFamilyMessage = message.direction === 'inbound'
          return (
            <div
              key={message.id}
              className={cn('flex', isFamilyMessage ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm',
                  isFamilyMessage
                    ? 'rounded-br-md bg-pk-primary text-white'
                    : 'rounded-bl-md border border-pk-border bg-pk-muted/35 text-pk-ink'
                )}
              >
                <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.14em] opacity-80">
                  <span>{message.sender_name || (isFamilyMessage ? 'Familia' : 'Profesor')}</span>
                  <span>{new Date(message.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-6">{message.message_text}</p>
              </div>
            </div>
          )
        })}
      </div>

      <footer className="border-t border-pk-border bg-pk-snow/50 p-4">
        {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            void sendMessage()
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder}
            className="pk-input flex-1"
            maxLength={1400}
            autoComplete="off"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="sm:w-auto">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            <span className="ml-1">{sendLabel}</span>
          </Button>
        </form>
        <p className="mt-2 text-xs text-pk-sub">
          Este hilo queda ligado a esta entrega y se sincroniza para ambos lados.
        </p>
      </footer>
    </section>
  )
}
