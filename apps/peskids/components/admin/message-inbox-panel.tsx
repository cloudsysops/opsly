'use client';

import { useCallback, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { MessageInboxItem } from './message-inbox-item';
import { MessageReplyComposer } from './message-reply-composer';
import { type ThreadResponse } from './message-inbox-utils';

type ReplyAction = 'approve' | 'send' | 'mark_sent' | 'skip';

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
  const [generating, setGenerating] = useState(false);

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
      setThreadState(data.status ?? data.inbound.status ?? 'pending_approval');
      setThreadMode(data.conversation_mode ?? null);
      setReplyText(data.suggested_reply ?? '');
    } catch {
      setStatus('Error al cargar borrador sugerido');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReply = useCallback(async () => {
    if (!activeId) return;
    setGenerating(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/messages/${activeId}/suggest-reply`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
          return;
        }
        setStatus(data.error ?? 'No se pudo generar una respuesta');
        return;
      }
      if (data.reply) {
        setReplyText(data.reply);
      }
    } catch {
      setStatus('Error de red al generar la respuesta');
    } finally {
      setGenerating(false);
    }
  }, [activeId]);

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

  const runAction = useCallback(
    async (action: ReplyAction) => {
      if (!activeId) return;
      if (action !== 'skip' && !replyText.trim()) return;

      setSending(true);
      setStatus(null);
      try {
        const res = await fetch(`/api/messages/${activeId}/reply`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ replyText: replyText.trim(), action }),
        });
        const data = (await res.json()) as { message?: string; error?: string; status?: string };
        if (!res.ok) {
          if (res.status === 401) {
            setStatus('Sesión vencida. Vuelve a iniciar sesión en admin.');
            return;
          }
          setStatus(data.error ?? 'No se pudo completar la acción');
          return;
        }
        setStatus(data.message ?? 'Listo');
        if (action === 'send' || action === 'mark_sent' || action === 'skip') {
          setActiveId(null);
          setReplyText('');
          setThreadMode(null);
        }
        setThreadState(data.status ?? threadState);
      } catch {
        setStatus('Error de red');
      } finally {
        setSending(false);
      }
    },
    [activeId, replyText, threadState]
  );

  const pendingCount = messages.filter((message) => {
    if (message.direction !== 'inbound') return false;
    const status = message.status ?? 'pending_approval';
    return status === 'pending' || status === 'pending_approval';
  }).length;

  if (messages.length === 0) {
    return <p className="text-sm text-pk-sub">Sin mensajes entrantes recientes.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-pk-ink">Mensajes</p>
        {pendingCount > 0 ? (
          <p className="text-xs text-pk-sub">{pendingCount} pendientes de aprobación</p>
        ) : null}
      </div>
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
        generating={generating}
        replyText={replyText}
        threadState={threadState}
        threadMode={threadMode}
        onReplyChange={setReplyText}
        onGenerate={() => {
          void generateReply();
        }}
        onApprove={() => {
          void runAction('approve');
        }}
        onCopy={() => {
          if (activeId) {
            void copyMessage(activeId, replyText);
          }
        }}
        onMarkSent={() => {
          void runAction('mark_sent');
        }}
        onSend={() => {
          void runAction('send');
        }}
        onSkip={() => {
          void runAction('skip');
        }}
        onCancel={() => {
          setActiveId(null);
        }}
      />

      {status ? <p className="text-xs text-pk-sub">{status}</p> : null}
    </div>
  );
}
