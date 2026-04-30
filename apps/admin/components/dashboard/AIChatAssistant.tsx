'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Mic, Send, Bot, User, TerminalSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ChatMessage = {
  role: 'assistant' | 'user';
  text: string;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
  }
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    text: 'IA Assist online. Ask about metrics, anomalies, or deployment recommendations.',
  },
];

function aiReply(input: string): string {
  const value = input.toLowerCase();
  if (value.includes('cpu')) {
    return 'Pattern detected: throttle high-cost agents and prioritize neural queue tier-1.';
  }
  if (value.includes('tenant')) {
    return 'Recommendation: focus onboarding bottlenecks and auto-tag high-variance tenants.';
  }
  if (value.includes('deploy')) {
    return 'Precheck: confirm VPS_* and PLATFORM_DOMAIN secrets before the next release window.';
  }
  return 'Neural sync complete. Suggestion: monitor predictive load panels and apply staged rollout.';
}

export function AIChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);

  const speechAvailable = useMemo(() => typeof window !== 'undefined' && Boolean(window.webkitSpeechRecognition), []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return;
    }

    const userMessage: ChatMessage = { role: 'user', text: trimmed };
    const assistantMessage: ChatMessage = { role: 'assistant', text: aiReply(trimmed) };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
  }

  function startSpeechToText() {
    if (!speechAvailable || !window.webkitSpeechRecognition) {
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim().length > 0) {
        setInput(transcript.trim());
      }
      setListening(false);
    };
    recognition.onerror = () => {
      setListening(false);
    };
    setListening(true);
    recognition.start();
  }

  return (
    <Card className="stagger-fade h-full [animation-delay:130ms]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-ops-magenta" />
          Cyber Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full min-h-[460px] flex-col gap-3">
        <div className="holo-border flex-1 space-y-2 overflow-auto rounded-xl bg-ops-bg/55 p-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index.toString()}`}
              className={`rounded-lg border p-2 text-xs ${
                message.role === 'assistant'
                  ? 'border-ops-cyan/40 bg-ops-cyan/10 text-ops-cyan'
                  : 'border-ops-magenta/40 bg-ops-magenta/10 text-neutral-100'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 uppercase tracking-[0.12em]">
                {message.role === 'assistant' ? (
                  <TerminalSquare className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                {message.role}
              </div>
              <p>{message.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type command for AI..."
            className="holo-border flex-1 rounded-lg bg-ops-bg/70 px-3 py-2 text-xs text-neutral-100 outline-none"
          />
          <button
            type="button"
            onClick={startSpeechToText}
            disabled={!speechAvailable}
            className="cyber-hover rounded-lg border border-ops-purple/50 bg-ops-purple/20 p-2 text-ops-purple disabled:opacity-40"
            title={speechAvailable ? 'Speech to text' : 'Speech not supported in this browser'}
          >
            <Mic className={`h-4 w-4 ${listening ? 'animate-pulse text-ops-cyan' : ''}`} />
          </button>
          <button
            type="submit"
            className="cyber-hover rounded-lg border border-ops-cyan/50 bg-ops-cyan/20 p-2 text-ops-cyan"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
