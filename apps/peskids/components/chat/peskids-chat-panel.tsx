'use client'

import React, { type RefObject } from 'react'
import { Send, X } from 'lucide-react'
import type { PeskidsChatMessage } from '@/hooks/use-peskids-chat'
import { cn } from '@/lib/utils'

type PeskidsChatPanelProps = {
  messages: PeskidsChatMessage[]
  input: string
  sending: boolean
  listRef: RefObject<HTMLDivElement | null>
  onInputChange: (value: string) => void
  onSend: () => void
  onClose?: () => void
  variant: 'inline' | 'floating'
  className?: string
}

export function PeskidsChatPanel({
  messages,
  input,
  sending,
  listRef,
  onInputChange,
  onSend,
  onClose,
  variant,
  className,
}: PeskidsChatPanelProps): React.ReactElement {
  const isInline = variant === 'inline'

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-white',
        isInline
          ? 'h-[min(520px,70vh)] rounded-2xl border border-pk-border shadow-card'
          : 'h-full rounded-2xl border border-pk-border shadow-lg',
        className
      )}
      role={isInline ? 'region' : 'dialog'}
      aria-label="Chat Peskids"
    >
      <header className="flex items-center justify-between bg-pk-primary px-4 py-3 text-white">
        <div>
          <p className="font-display text-sm font-bold">
            {isInline ? 'Reserva por chat' : 'Peskids'}
          </p>
          <p className="text-[11px] opacity-90">
            {isInline
              ? 'Clase de prueba gratis · te guiamos paso a paso'
              : 'Asistente · respuesta orientativa'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/15"
            aria-label="Cerrar chat"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <div ref={listRef as React.LegacyRef<HTMLDivElement>} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}
          >
            <p
              className={cn(
                'max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap',
                m.role === 'user' ? 'bg-pk-primary text-white' : 'bg-pk-muted text-pk-ink'
              )}
            >
              {m.text}
            </p>
            {m.role === 'assistant' && typeof m.progress === 'number' ? (
              <p className="mt-1 text-[11px] text-pk-sub">
                {m.stage === 'handoff'
                  ? 'Listo para soporte humano'
                  : `Datos para tu reserva · ${Math.max(1, Math.round(m.progress * 5))}/5`}
              </p>
            ) : null}
          </div>
        ))}
        {sending ? <p className="text-xs text-pk-sub animate-pulse">Escribiendo…</p> : null}
      </div>

      <form
        className="flex gap-2 border-t border-pk-border p-3"
        onSubmit={(e) => {
          e.preventDefault()
          onSend()
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={isInline ? 'Ej: Hola, soy María, mi hijo tiene 4 años…' : 'Escribe tu pregunta…'}
          className="pk-input flex-1 text-sm"
          disabled={sending}
          maxLength={2000}
          autoComplete="off"
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
  )
}
