'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getOrCreateChatSessionId } from '@/lib/peskids-chat-session';
import {
  writePeskidsLeadSession,
  type PeskidsLeadSession,
} from '@/lib/peskids-lead-session';
import {
  PESKIDS_APPLICANT_ROLE_CHOICES,
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
  whatsappUrl?: string | null;
  whatsappLabel?: string | null;
  leadSaved?: boolean;
  classModality?: 'llanogrande' | 'domicilio' | null;
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
    text: `${peskidsIntakeWelcome()}\n\n¿Para quién es esta solicitud? Toca una opción 👇`,
    quickReplies: PESKIDS_APPLICANT_ROLE_CHOICES,
    inputMode: 'choice',
  };
}

export function usePeskidsChat(mode: PeskidsChatMode = 'admissions'): {
  mode: PeskidsChatMode;
  messages: PeskidsChatMessage[];
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  sendMessage: (textOverride?: string, displayText?: string) => Promise<void>;
  listRef: RefObject<HTMLDivElement | null>;
  handoff: {
    whatsappUrl: string | null;
    whatsappLabel: string | null;
    leadSaved: boolean;
    classModality: 'llanogrande' | 'domicilio' | null;
  } | null;
} {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<PeskidsChatMessage[]>([buildWelcome(mode)]);
  const [handoff, setHandoff] = useState<{
    whatsappUrl: string | null;
    whatsappLabel: string | null;
    leadSaved: boolean;
    classModality: 'llanogrande' | 'domicilio' | null;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (textOverride?: string, displayText?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || sending) return;

      if (!textOverride) setInput('');
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: (displayText ?? text).trim() || text },
      ]);
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
          lead_saved?: boolean;
          whatsapp?: { url: string; label: string } | null;
          profile?: {
            parentName?: string;
            classModality?: 'llanogrande' | 'domicilio';
            applicantRole?: 'family' | 'teacher_applicant' | 'company';
          } | null;
          error?: string;
        };

        if (!res.ok || !data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text:
                mode === 'support'
                  ? 'No pude responder ahora. Intenta de nuevo en unos minutos o escribe desde el portal de familias.'
                  : 'No pude responder ahora. Intenta de nuevo en unos minutos.',
            },
          ]);
          return;
        }

        const suffix = data.disclaimer ? `\n\n_${data.disclaimer}_` : '';
        const modality = data.profile?.classModality ?? null;
        const leadType = data.profile?.applicantRole ?? (mode === 'admissions' ? 'family' : null);
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
            whatsappUrl: data.whatsapp?.url ?? null,
            whatsappLabel: data.whatsapp?.label ?? null,
            leadSaved: data.lead_saved,
            classModality: modality,
          },
        ]);

        if (data.stage === 'handoff' && data.profile?.parentName) {
          const session: PeskidsLeadSession = {
            name: data.profile.parentName,
            capturedAt: new Date().toISOString(),
            class_modality: modality,
            lead_type: leadType,
          };
          writePeskidsLeadSession(session.name, {
            class_modality: session.class_modality,
            lead_type: session.lead_type,
          });
          setHandoff({
            whatsappUrl: data.whatsapp?.url ?? null,
            whatsappLabel: data.whatsapp?.label ?? null,
            leadSaved: Boolean(data.lead_saved),
            classModality: modality,
          });
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text:
              mode === 'support'
                ? 'Error de conexión. Intenta de nuevo en unos minutos.'
                : 'Error de conexión. Intenta de nuevo en unos minutos.',
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [input, mode, sending]
  );

  return { mode, messages, input, setInput, sending, sendMessage, listRef, handoff };
}
