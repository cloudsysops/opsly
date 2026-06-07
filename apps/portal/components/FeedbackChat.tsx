'use client';

import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  decision_type?: string;
}

interface FeedbackChatProps {
  tenantSlug: string;
  userEmail: string;
}

export function FeedbackChat({ tenantSlug, userEmail }: FeedbackChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '👋 Hola! Soy el asistente de Opsly. ¿Tienes algún feedback, error o sugerencia de mejora?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          user_email: userEmail,
          message: userMessage,
          conversation_id: conversationId,
        }),
      });

      const data = (await res.json()) as {
        conversation_id?: string;
        message?: string;
        decision_type?: string | null;
      };
      if (data.conversation_id) setConversationId(data.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message ?? 'Sin respuesta',
          decision_type: data.decision_type ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error al enviar. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (type?: string) => {
    if (!type) return null;
    const badges: Record<string, { label: string; color: string }> = {
      auto_implement: { label: '⚡ Implementando automáticamente', color: '#22c55e' },
      needs_approval: { label: '⏳ Esperando aprobación', color: '#eab308' },
      scheduled: { label: '📅 Agendado', color: '#3b82f6' },
      rejected: { label: '❌ No aplica', color: '#ef4444' },
    };
    const badge = badges[type];
    if (!badge) return null;
    return (
      <span
        style={{
          fontSize: '11px',
          color: badge.color,
          display: 'block',
          marginTop: '4px',
        }}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ops-blue text-white shadow-lg shadow-ops-blue/40 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-green/80'
        )}
        aria-label={open ? 'Cerrar feedback' : 'Abrir feedback'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open ? (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[360px] flex-col overflow-hidden rounded-2xl border border-ops-border bg-ops-bg shadow-2xl shadow-black/50">
          <div className="border-b border-ops-border/50 bg-ops-surface/50 p-4">
            <div className="text-sm font-semibold text-neutral-100">
              💬 Feedback & Sugerencias
            </div>
            <div className="mt-0.5 text-xs text-ops-gray">Tu feedback mejora el producto</div>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
            aria-live="polite"
            aria-atomic="false"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div
                  style={{
                    background: msg.role === 'user' ? '#6366f1' : '#1a1a1a',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}
                >
                  {msg.content}
                </div>
                {getDecisionBadge(msg.decision_type)}
              </div>
            ))}
            {loading ? (
              <div className="flex items-center gap-2 self-start p-2 text-sm text-ops-gray">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analizando...</span>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 border-t border-ops-border/50 p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void sendMessage();
              }}
              placeholder="Escribe tu feedback..."
              className="h-9 text-xs"
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="flex h-9 items-center justify-center rounded-sm bg-ops-blue px-3 text-white transition-opacity disabled:opacity-50"
              aria-label="Enviar"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
