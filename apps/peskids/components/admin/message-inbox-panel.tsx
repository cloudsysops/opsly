'use client';

import { useCallback, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { MessageInboxItem } from './message-inbox-item';
import { MessageReplyComposer } from './message-reply-composer';
import { type ThreadResponse } from './message-inbox-utils';

export function MessageInboxPanel({
  messages,
}: {
  messages: DashboardData['recent_messages'];
}): React.ReactElement {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [threadState, setThreadState] = useState<string | null>(null);
  const [threadMode, setThreadMode] = useState<'admissions' | 'support' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const openThread = useCallback(async (messageId: string) => {
    setActiveId(messageId);
    setLoading(true);
    setStatus(null);
    setThreadMode(null);
    try {
      const res = await fetch(`/api/messages/${messageId}/thread`, {
        credentials: 'include',
      });
      const data = (await res.json()) as ThreadResponse & { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
          return;
        }
        setStatus(data.error ?? 'No se pudo cargar el hilo');
        return;
      }
      setThreadState(data.status ?? data.inbound.status ?? 'pending');
      setThreadMode(data.conversation_mode ?? null);
      setReplyText(data.suggested_reply ?? '');
    } catch {
      setStatus('Error al cargar borrador sugerido');
    } finally {
      setLoading(false);
    }
  }, []);

  const copyMessage = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      window.setTimeout(
        () => setCopiedId((current) => (current === messageId ? null : current)),
        1200
      );
    } catch {
      window.prompt('Copia este texto', text);
    }
  }, []);

  const sendReply = useCallback(async () => {
    if (!activeId || !replyText.trim()) return;

    setSending(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/messages/${activeId}/reply`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText: replyText.trim() }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
          return;
        }
        setStatus(data.error ?? 'Error al enviar');
        return;
      }
      setStatus(data.message ?? 'Enviado');
      setActiveId(null);
      setReplyText('');
      setThreadState('sent');
      setThreadMode(null);
    } catch {
      setStatus('Error de red al enviar');
    } finally {
      setSending(false);
    }
  }, [activeId, replyText]);

  if (messages.length === 0) {
    return <p className="text-sm text-pk-sub">Sin mensajes entrantes recientes.</p>;
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-52 space-y-2 overflow-y-auto">
        {messages.map((message) => (
          <MessageInboxItem
            key={message.id}
            message={message}
            isActive={activeId === message.id}
            copied={copiedId === message.id}
            onOpenThread={(messageId) => {
              void openThread(messageId);
            }}
            onCopyMessage={(messageId, text) => {
              void copyMessage(messageId, text);
            }}
          />
        ))}
      </ul>

      <MessageReplyComposer
        active={activeId !== null}
        loading={loading}
        sending={sending}
        replyText={replyText}
        threadState={threadState}
        threadMode={threadMode}
        onReplyChange={setReplyText}
        onSend={() => {
          void sendReply();
        }}
        onCancel={() => {
          setActiveId(null);
        }}
      />

      {status ? <p className="text-xs text-pk-sub">{status}</p> : null}
    </div>
  );
}
