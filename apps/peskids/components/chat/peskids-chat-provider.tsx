'use client';

import { createContext, useContext } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { usePeskidsChat, type PeskidsChatMessage } from '@/hooks/use-peskids-chat';
import type { PeskidsChatMode } from '@/lib/peskids-intake-messages';

type PeskidsChatContextValue = {
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
};

const PeskidsChatContext = createContext<PeskidsChatContextValue | null>(null);

export function PeskidsChatProvider({
  children,
  mode = 'admissions',
}: {
  children: ReactNode;
  mode?: PeskidsChatMode;
}): ReactElement {
  const chat = usePeskidsChat(mode);
  return <PeskidsChatContext.Provider value={chat}>{children}</PeskidsChatContext.Provider>;
}

export function usePeskidsChatContext(): PeskidsChatContextValue {
  const ctx = useContext(PeskidsChatContext);
  if (!ctx) {
    throw new Error('usePeskidsChatContext must be used within PeskidsChatProvider');
  }
  return ctx;
}
