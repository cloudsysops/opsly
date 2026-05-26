'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getOrCreateChatSessionId } from '@/lib/peskids-chat-session';
import {
  peskidsIntakeWelcome,
  peskidsSupportWelcome,
  type PeskidsChatMode,
} from '@/lib/peskids-intake-messages';

export type PeskidsChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  fromLlm?: boolean;
  stage?: 'collecting' | 'handoff';
  progress?: number;
  quickReplies?: PeskidsChatQuickReply[] | null;
  inputMode?: 'text' | 'choice';
};

export type PeskidsChatQuickReply = {
  label: string;
  value: string;
};

function buildWelcome(mode: PeskidsChatMode): PeskidsChatMessage {
  if (mode === 'support') {
    return {
      role: 'assistant',
      text: `${peskidsSupportWelcome('web')}\n\n¿Puedes contarnos cuál es el caso?`,
    };
  }

  return {
    role: 'assistant',
    text: `${peskidsIntakeWelcome('web')}\n\nPara empezar, ¿cómo te llamas (nombre del acudiente)?`,
  };
}

export function usePeskidsChat(mode: PeskidsChatMode = 'admissions'): {
  mode: PeskidsChatMode;
  messages: PeskidsChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  sendMessage: (textOverride?: string) => Promise<void>;
  listRef: RefObject<HTMLDivElement | null>;
} {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<PeskidsChatMessage[]>([buildWelcome(mode)]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || sending) return;

      if (!textOverride) setInput('');
      setMessages((prev) => [...prev, { role: 'user', text }]);
      setSending(true);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            session_id: getOrCreateChatSessionId(mode),
            mode,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          disclaimer?: string;
          from_llm?: boolean;
          stage?: 'collecting' | 'handoff';
          progress?: number;
          input_mode?: 'text' | 'choice';
          quick_replies?: PeskidsChatQuickReply[] | null;
          error?: string;
        };

        if (!res.ok || !data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: 'No pude responder ahora. Escríbenos por WhatsApp y te ayudamos enseguida.',
            },
          ]);
          return;
        }

        const suffix = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `${data.reply}${suffix}`,
            fromLlm: data.from_llm,
            stage: data.stage,
            progress: data.progress,
            quickReplies: data.quick_replies ?? null,
            inputMode: data.input_mode,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: 'Error de conexión. Intenta de nuevo o contáctanos por WhatsApp.',
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [input, mode, sending]
  );

  return { mode, messages, input, setInput, sending, sendMessage, listRef };
}
