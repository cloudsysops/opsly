'use client';

import { getApiBaseUrl } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

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
    const badges: Record<string, { label: string; colorClass: string }> = {
      auto_implement: { label: '⚡ Implementando automáticamente', colorClass: 'text-ops-green' },
      needs_approval: { label: '⏳ Esperando aprobación', colorClass: 'text-ops-yellow' },
      scheduled: { label: '📅 Agendado', colorClass: 'text-ops-blue' },
      rejected: { label: '❌ No aplica', colorClass: 'text-ops-red' },
    };
    const badge = badges[type];
    if (!badge) return null;
    return (
      <span className={cn('block mt-1 text-[11px] font-medium', badge.colorClass)}>{badge.label}</span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 z-[1000] shadow-lg shadow-black/40 border border-ops-green/30 hover:border-ops-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-green/80',
          open ? 'bg-ops-surface text-neutral-100' : 'bg-ops-green/10 text-ops-green hover:bg-ops-green/20'
        )}
        aria-label={open ? 'Cerrar feedback' : 'Abrir feedback'}
      >
        {open ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {open ? (
        <div
          className={cn(
            'fixed bottom-24 right-6 w-[360px] h-[500px] bg-ops-bg border border-ops-border rounded-lg flex flex-col z-[1000] overflow-hidden shadow-2xl shadow-black/60 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300'
          )}
        >
          <div className="p-4 border-b border-ops-border bg-ops-surface/50">
            <div className="font-semibold text-neutral-100 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-ops-green" />
              Feedback & Sugerencias
            </div>
            <div className="text-xs text-ops-gray mt-0.5">
              Tu feedback mejora el producto
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
            aria-live="polite"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%]',
                  msg.role === 'user' ? 'self-end' : 'self-start'
                )}
              >
                <div
                  className={cn(
                    'p-3 text-sm leading-relaxed border',
                    msg.role === 'user'
                      ? 'bg-ops-green/10 border-ops-green/30 text-neutral-100 rounded-2xl rounded-tr-sm'
                      : 'bg-ops-surface border-ops-border text-neutral-100 rounded-2xl rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
                {getDecisionBadge(msg.decision_type)}
              </div>
            ))}
            {loading ? (
              <div className="self-start p-2 flex items-center gap-2 text-xs text-ops-gray italic">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analizando...
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-ops-border flex gap-2 bg-ops-surface/30">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu feedback..."
              className="flex-1 h-9 bg-ops-bg text-xs"
              aria-label="Tu feedback"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-9 h-9 p-0 rounded-sm"
              aria-label="Enviar feedback"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
