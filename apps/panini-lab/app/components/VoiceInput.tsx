'use client';

import { useState, useRef } from 'react';

// Minimal Web Speech API types (not fully in all TS DOM versions)
interface SpeechRecognitionResult {
  readonly 0: { transcript: string };
}
interface SpeechRecognitionEvent {
  results: { [index: number]: SpeechRecognitionResult };
}
interface SpeechRecog {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecogConstructor = new () => SpeechRecog;

function getSpeechRecognition(): SpeechRecogConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as SpeechRecogConstructor | undefined;
}

export default function VoiceInput() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [reply, setReply] = useState('');
  const recognitionRef = useRef<SpeechRecog | null>(null);

  function startListening() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setStatus('error');
      setReply('Tu navegador no soporta reconocimiento de voz. Usa Chrome.');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript ?? '';
      setTranscript(text);
    };
    recognition.onerror = () => {
      setListening(false);
      setStatus('error');
      setReply('Error al escuchar. Verifica permisos del micrófono.');
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus('idle');
    setReply('');
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function sendTranscript() {
    if (!transcript.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/webhooks/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript, sender: 'voice-dashboard', channel: 'web' }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (res.ok) {
        setStatus('ok');
        setReply(json.reply ?? '✅ Registrado');
        setTranscript('');
      } else {
        setStatus('error');
        setReply(json.error ?? 'Error al enviar');
      }
    } catch {
      setStatus('error');
      setReply('No se pudo conectar con el servidor');
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
      <h2 className="text-lg font-medium">Voz 🎤</h2>
      <p className="text-zinc-400 text-sm">
        Habla para registrar figuritas. Ejemplo:{' '}
        <em className="not-italic text-zinc-300">
          &ldquo;Tengo la 10 de Colombia y la 45 de Brasil repetida&rdquo;
        </em>
      </p>

      <div className="flex gap-2 flex-wrap">
        {!listening ? (
          <button
            onClick={startListening}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition-colors"
          >
            🎙 Escuchar
          </button>
        ) : (
          <button
            onClick={stopListening}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium transition-colors animate-pulse"
          >
            ⏹ Detener
          </button>
        )}

        {transcript && status !== 'ok' && (
          <button
            onClick={() => void sendTranscript()}
            disabled={status === 'sending'}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {status === 'sending' ? 'Enviando…' : '✉ Registrar'}
          </button>
        )}
      </div>

      {transcript && (
        <p className="text-sm border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 italic">
          &ldquo;{transcript}&rdquo;
        </p>
      )}

      {reply && (
        <p
          className={`text-sm font-medium ${status === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {reply}
        </p>
      )}
    </div>
  );
}
