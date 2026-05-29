'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useStickerContext } from '@/hooks/useStickerContext';

interface Message {
  id: string;
  role: 'user' | 'bbc';
  content: string;
  timestamp: Date;
  actions?: Array<{ label: string; action: string }>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'bbc',
      content:
        '¡Hola! Soy BBC, tu asistente de colecciones Panini. ¿Qué quieres saber sobre tus estampillas?',
      timestamp: new Date(),
      actions: [
        { label: '¿Tengo a Messi?', action: 'do_i_have:messi' },
        { label: '¿Qué me falta?', action: 'what_missing' },
        { label: 'Ver mi inventario', action: 'show_inventory' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isRecording, startRecording, stopRecording, transcript } = useVoiceInput();
  useStickerContext();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSendMessage = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await response.json();

      const bbcMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'bbc',
        content: data.content,
        timestamp: new Date(),
        actions: data.actions,
      };

      setMessages((prev) => [...prev, bbcMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 2}`,
          role: 'bbc',
          content: 'Perdón, hubo un error. Intenta de nuevo.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: string) => {
    handleSendMessage(action);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md px-4 py-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              {msg.actions && msg.role === 'bbc' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAction(action.action)}
                      className="bg-white text-indigo-600 text-xs px-3 py-1 rounded hover:bg-indigo-50 transition"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-6 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Escribe una pregunta o presiona el micrófono..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading || isRecording}
          />
          <button
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isRecording ? '🛑 Detener' : '🎤 Voz'}
          </button>
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Enviar
          </button>
        </div>
        <div className="flex gap-2 justify-center text-xs">
          <a href="/scan" className="text-indigo-600 hover:underline">
            📷 Escanear estampilla
          </a>
          <span className="text-gray-400">•</span>
          <a href="/inventory" className="text-indigo-600 hover:underline">
            📚 Mi colección
          </a>
          <span className="text-gray-400">•</span>
          <a href="/wishlist" className="text-indigo-600 hover:underline">
            ⭐ Lista de deseos
          </a>
        </div>
      </div>
    </div>
  );
}
