'use client';

import { getApiBaseUrl } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
    const badges: Record<string, { label: string; state: 'healthy' | 'unhealthy' | 'unknown' }> = {
      auto_implement: { label: '⚡ Implementando', state: 'healthy' },
      needs_approval: { label: '⏳ Aprobación', state: 'unknown' },
      scheduled: { label: '📅 Agendado', state: 'unknown' },
      rejected: { label: '❌ No aplica', state: 'unhealthy' },
    };
    const badge = badges[type];
    if (!badge) return null;
    return <StatusBadge state={badge.state} label={badge.label} className="mt-1" />;
  };

  return (
    <>
      <Button
        type="button"
        variant="primary"
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-[1000] h-14 w-14 rounded-full p-0 shadow-lg shadow-black/40 transition-transform active:scale-95',
          open && 'bg-ops-surface border-ops-border text-neutral-100 hover:bg-ops-border/40'
        )}
        aria-label={open ? 'Cerrar feedback' : 'Abrir feedback'}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </Button>

      {open ? (
        <div className="fixed bottom-[92px] right-6 z-[1000] flex h-[500px] w-[360px] animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-xl border border-ops-border bg-ops-bg shadow-2xl shadow-black/60 duration-200">
          <div className="border-b border-ops-border bg-ops-surface px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
              <MessageSquare className="h-4 w-4 text-ops-green" />
              Feedback & Sugerencias
            </div>
            <div className="mt-0.5 text-xs text-ops-gray">Tu feedback mejora el producto</div>
          </div>

          <div
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-ops-border"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'self-end bg-ops-green/20 border border-ops-green/30 text-neutral-100 rounded-tr-none'
                    : 'self-start bg-ops-surface border border-ops-border text-neutral-200 rounded-tl-none'
                )}
              >
                {msg.content}
                {getDecisionBadge(msg.decision_type)}
              </div>
            ))}
            {loading ? (
              <div
                className="flex items-center gap-2 p-2 text-xs text-ops-gray animate-pulse"
                aria-hidden="true"
              >
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analizando...</span>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-ops-border p-3 bg-ops-surface/50">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu feedback..."
              aria-label="Tu feedback"
              className="h-9 bg-ops-bg text-xs"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="h-9 w-9 shrink-0 p-0"
              aria-label="Enviar feedback"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
