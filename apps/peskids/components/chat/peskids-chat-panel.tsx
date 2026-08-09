'use client';

import React, { type RefObject } from 'react';
import { Check, ExternalLink, Send, X } from 'lucide-react';
import type { PeskidsChatMessage, PeskidsChatQuickReply } from '@/hooks/use-peskids-chat';
import type { PeskidsChatMode } from '@/lib/peskids-intake-messages';
import { cn } from '@/lib/utils';

type PeskidsChatPanelProps = {
  messages: PeskidsChatMessage[];
  input: string;
  sending: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onQuickReply?: (reply: PeskidsChatQuickReply) => void;
  onClose?: () => void;
  variant: 'inline' | 'floating';
  mode?: PeskidsChatMode;
  className?: string;
  handoffWhatsAppUrl?: string | null;
  handoffWhatsAppLabel?: string | null;
  leadSaved?: boolean;
};

/** Ventana de chat estilo WhatsApp: burbujas, chips de selección y handoff humano. */
export function PeskidsChatPanel({
  messages,
  input,
  sending,
  listRef,
  onInputChange,
  onSend,
  onQuickReply,
  onClose,
  variant,
  mode = 'admissions',
  className,
  handoffWhatsAppUrl,
  handoffWhatsAppLabel,
  leadSaved,
}: PeskidsChatPanelProps): React.ReactElement {
  const isInline = variant === 'inline';
  const isSupport = mode === 'support';
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const showHandoffCta =
    Boolean(handoffWhatsAppUrl) ||
    Boolean(lastAssistant?.stage === 'handoff' && lastAssistant.whatsappUrl);
  const waUrl = handoffWhatsAppUrl ?? lastAssistant?.whatsappUrl ?? null;
  const waLabel =
    handoffWhatsAppLabel ??
    lastAssistant?.whatsappLabel ??
    'Continuar por WhatsApp con un asesor';
  const saved = leadSaved ?? lastAssistant?.leadSaved ?? false;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden',
        isInline
          ? 'h-[min(620px,80vh)] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
          : 'h-full rounded-2xl shadow-lg',
        className
      )}
      role={isInline ? 'region' : 'dialog'}
      aria-label="Chat Peskids estilo WhatsApp"
    >
      <header className="flex items-center gap-3 bg-[#075E54] px-3 py-2.5 text-white">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-sm font-bold text-white"
          aria-hidden
        >
          Pk
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide">
            {isSupport ? 'Peskids · Soporte' : 'Peskids · Matrícula'}
          </p>
          <p className="truncate text-[11px] text-white/80">
            {sending
              ? 'escribiendo…'
              : isSupport
                ? 'en línea · incidencias y seguimiento'
                : 'en línea · responde tocando las opciones'}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-white/10"
            aria-label="Cerrar chat"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </header>

      <div
        ref={listRef as React.LegacyRef<HTMLDivElement>}
        className="flex-1 space-y-2 overflow-y-auto px-2.5 py-3"
        style={{
          backgroundColor: '#E5DDD5',
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23cbb9a8\' fill-opacity=\'0.28\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      >
        {messages.length === 0 ? (
          <p className="mx-auto max-w-[90%] rounded-lg bg-white/90 px-3 py-2 text-center text-[11px] leading-relaxed text-[#54656F] shadow-sm">
            Este chat guarda tus respuestas para conectar con un asesor humano. No reemplaza la
            evaluación de instructores.{' '}
            <a href="/privacy" className="font-semibold text-[#027EB5] hover:underline">
              Privacidad
            </a>
          </p>
        ) : null}

        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const isLastAssistant =
            !isUser && i === messages.map((x) => x.role).lastIndexOf('assistant');
          return (
            <div
              key={`${i}-${m.role}`}
              className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'relative max-w-[88%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug shadow-sm whitespace-pre-wrap',
                  isUser
                    ? 'rounded-tr-none bg-[#DCF8C6] text-[#111B21]'
                    : 'rounded-tl-none bg-white text-[#111B21]'
                )}
              >
                {m.text}
                {m.role === 'assistant' && typeof m.progress === 'number' && m.stage !== 'handoff' ? (
                  <p className="mt-1 text-[10px] text-[#667781]">
                    Paso {Math.max(1, Math.round((m.progress || 0) * 10))}/10
                  </p>
                ) : null}
                {m.role === 'assistant' && m.stage === 'handoff' ? (
                  <p className="mt-1 text-[10px] font-medium text-[#075E54]">
                    {saved || m.leadSaved
                      ? 'Solicitud guardada · listo para asesor humano'
                      : 'Listo para soporte humano'}
                  </p>
                ) : null}
              </div>

              {isLastAssistant && m.quickReplies?.length && !showHandoffCta ? (
                <div className="mt-2 flex max-w-[95%] flex-wrap gap-1.5">
                  {m.quickReplies.map((reply) => (
                    <button
                      key={reply.value}
                      type="button"
                      disabled={sending}
                      onClick={() => onQuickReply?.(reply)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#25D366] bg-white px-3 py-1.5 text-xs font-semibold text-[#075E54] shadow-sm transition hover:bg-[#E7FCEF] disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5 text-[#25D366]" aria-hidden />
                      {reply.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {sending ? (
          <p className="ml-1 inline-flex rounded-lg bg-white px-3 py-1.5 text-xs text-[#667781] shadow-sm">
            …
          </p>
        ) : null}
      </div>

      {showHandoffCta && waUrl ? (
        <div className="border-t border-black/5 bg-[#F0F2F5] px-3 py-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-105"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {waLabel}
          </a>
          <p className="mt-2 text-center text-[11px] text-[#667781]">
            {saved
              ? 'Tus datos ya están en la plataforma. El asesor abre el chat correcto sin que vuelvas a elegir.'
              : 'Continúa con el asesor humano por WhatsApp.'}
          </p>
        </div>
      ) : (
        <form
          className="flex items-center gap-2 bg-[#F0F2F5] px-2 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={
              lastAssistant?.inputMode === 'choice'
                ? 'O escribe tu respuesta…'
                : isSupport
                  ? 'Escribe tu caso…'
                  : 'Escribe tu respuesta…'
            }
            className="h-10 flex-1 rounded-full border-0 bg-white px-4 text-sm text-[#111B21] shadow-sm outline-none ring-0 placeholder:text-[#8696A0] focus:ring-2 focus:ring-[#25D366]/40"
            disabled={sending}
            maxLength={2000}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#075E54] text-white disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}
