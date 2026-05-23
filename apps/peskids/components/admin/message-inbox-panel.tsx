'use client'

import { useCallback, useState } from 'react'
import { Loader2, Reply } from 'lucide-react'
import type { DashboardData } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const sourceTone: Record<string, 'green' | 'coral' | 'teal'> = {
  whatsapp: 'green',
  instagram: 'coral',
  web: 'teal',
}

type ThreadResponse = {
  inbound: { message_text: string; sender_name: string | null; sender_contact: string; source: string }
  suggested_reply: string | null
}

export function MessageInboxPanel({
  messages,
}: {
  messages: DashboardData['recent_messages']
}): React.ReactElement {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const openThread = useCallback(async (messageId: string) => {
    setActiveId(messageId)
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/messages/${messageId}/thread`, {
        credentials: 'include',
      })
      const data = (await res.json()) as ThreadResponse & { error?: string }
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.')
          return
        }
        setStatus(data.error ?? 'No se pudo cargar el hilo')
        return
      }
      setReplyText(data.suggested_reply ?? '')
    } catch {
      setStatus('Error al cargar borrador sugerido')
    } finally {
      setLoading(false)
    }
  }, [])

  const sendReply = useCallback(async () => {
    if (!activeId || !replyText.trim()) return

    setSending(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText: replyText.trim() }),
      })
      const data = (await res.json()) as { message?: string; error?: string }
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.')
          return
        }
        setStatus(data.error ?? 'Error al enviar')
        return
      }
      setStatus(data.message ?? 'Enviado')
      setActiveId(null)
      setReplyText('')
    } catch {
      setStatus('Error de red al enviar')
    } finally {
      setSending(false)
    }
  }, [activeId, replyText])

  if (messages.length === 0) {
    return <p className="text-sm text-pk-sub">Sin mensajes entrantes recientes.</p>
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-52 space-y-2 overflow-y-auto">
        {messages.map((msg) => {
          const tone = sourceTone[msg.source] ?? 'teal'
          const preview =
            msg.message_text.length > 48
              ? `${msg.message_text.slice(0, 48)}…`
              : msg.message_text
          return (
            <li key={msg.id}>
              <button
                type="button"
                onClick={() => void openThread(msg.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-pk-muted/50 ${
                  activeId === msg.id ? 'border-pk-primary bg-pk-muted/60' : 'border-pk-border/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-pk-ink">
                        {msg.sender_name || msg.sender_contact}
                      </p>
                      <Badge tone={tone}>{msg.source}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-pk-sub">{preview}</p>
                  </div>
                  <Reply className="h-3.5 w-3.5 shrink-0 text-pk-primary" aria-hidden />
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      {activeId ? (
        <div className="rounded-xl border border-pk-border bg-pk-muted/30 p-3">
          <p className="mb-2 text-xs font-medium text-pk-sub">Respuesta (editable · IA sugiere borrador)</p>
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-pk-sub">
              <Loader2 className="h-3 w-3 animate-spin" /> Cargando borrador…
            </p>
          ) : (
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="pk-input w-full text-sm"
              placeholder="Escribe la respuesta aprobada…"
            />
          )}
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={sending || loading || !replyText.trim()}
              onClick={() => void sendReply()}
            >
              {sending ? 'Enviando…' : 'Aprobar y enviar'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setActiveId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      {status ? <p className="text-xs text-pk-sub">{status}</p> : null}
    </div>
  )
}
