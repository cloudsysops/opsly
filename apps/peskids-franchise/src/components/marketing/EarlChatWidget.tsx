"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "What makes Peskids Franchise unique?",
  "Is there research behind your teaching approach?",
  "Do I need teaching experience?",
  "What's the investment required?",
];

// Parse markdown links and render as clickable anchors
function renderMessageContent(content: string) {
  // Match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Add the link as a clickable element
    const [, linkText, linkUrl] = match;
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-brand-purple hover:text-brand-navy underline font-medium"
      >
        {linkText}
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last link
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function EarlChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(true);
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("earl_session_id");
      if (stored) return stored;
      const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem("earl_session_id", newId);
      return newId;
    }
    return `session_${Date.now()}`;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setHasNewMessage(false);

    try {
      // Notify tracking system about Earl chat
      if (messages.length === 0) {
        const visitorId = localStorage.getItem("stc_visitor_id");
        if (visitorId) {
          fetch("/api/tracking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "earl_chat",
              visitorId,
              sessionId,
            }),
          }).catch(() => {}); // Fire and forget
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);

      if (data.shouldPromptCapture) {
        setShowLeadCapture(true);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again or reach out to us directly at franchising@peskids.com",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <>
      {/* Floating Chat Button - More Prominent */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300",
          isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
      >
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-3 whitespace-nowrap">
          <div className="bg-white text-brand-navy text-sm font-medium px-4 py-2 rounded-xl shadow-lg border border-gray-100 animate-bounce-gentle">
            Questions? Chat with Earl!
            <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white border-r border-b border-gray-100 transform rotate-45" />
          </div>
        </div>

        <button
          onClick={() => {
            setIsOpen(true);
            setHasNewMessage(false);
          }}
          className="group relative h-16 w-16 rounded-full bg-gradient-to-br from-brand-navy to-brand-purple text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
        >
          <span className="sr-only">Chat with Earl</span>
          {/* Bird icon */}
          <Image
            src="/images/characters/mascot.svg"
            alt="Earl"
            width={48}
            height={48}
            className="absolute inset-0 m-auto h-10 w-10 object-contain drop-shadow-sm"
          />
          {/* Notification pulse */}
          {hasNewMessage && (
            <>
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-orange rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-brand-orange rounded-full animate-ping" />
            </>
          )}
        </button>
      </div>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed z-50 bg-white shadow-2xl transition-all duration-300 overflow-hidden",
          "bottom-0 right-0 sm:bottom-6 sm:right-6",
          "w-full sm:w-[400px] sm:max-w-[calc(100vw-48px)]",
          "h-[100dvh] sm:h-auto sm:rounded-3xl",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand-navy to-brand-purple text-white p-4 safe-area-inset-top">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Image
                  src="/images/characters/mascot.svg"
                  alt="Earl"
                  width={40}
                  height={40}
                  className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 bg-brand-green rounded-full border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base sm:text-lg">Earl</h3>
              <p className="text-xs sm:text-sm text-white/80">Franchise Ambassador</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Compliance Disclaimer */}
          <p className="mt-2 text-[10px] text-white/60 leading-tight">
            Note: I cannot provide earnings projections or financial guarantees. Our team will share the Franchise Disclosure Document with you after your initial conversation.
          </p>
        </div>

        {/* Messages */}
        <div className="h-[calc(100dvh-200px)] sm:h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center py-6">
              <div className="inline-block p-4 bg-white rounded-2xl shadow-sm mb-4">
                <Image
                  src="/images/characters/mascot.svg"
                  alt="Earl"
                  width={64}
                  height={64}
                  className="h-16 w-16 mx-auto"
                />
              </div>
              <p className="text-gray-700 font-medium mb-1">
                Hi! I&apos;m Earl 👋
              </p>
              <p className="text-gray-500 text-sm mb-6">
                I&apos;m here to answer your questions about the Peskids Franchise opportunity.
              </p>
              <div className="space-y-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="block w-full text-left text-sm px-4 py-3 rounded-xl bg-white hover:bg-brand-light border border-gray-100 hover:border-brand-cyan text-gray-700 hover:text-brand-navy transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 mr-2">
                      <div className="h-8 w-8 bg-brand-light rounded-full flex items-center justify-center">
                        <Image
                          src="/images/characters/mascot.svg"
                          alt="Earl"
                          width={24}
                          height={24}
                          className="h-5 w-5"
                        />
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-gradient-to-br from-brand-navy to-brand-purple text-white rounded-br-md"
                        : "bg-white text-gray-700 rounded-bl-md"
                    )}
                  >
                    {message.role === "assistant"
                      ? renderMessageContent(message.content)
                      : message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="h-8 w-8 bg-brand-light rounded-full flex items-center justify-center">
                      <Image
                        src="/images/characters/mascot.svg"
                        alt="Earl"
                        width={24}
                        height={24}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 bg-brand-cyan rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 bg-brand-cyan rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 bg-brand-cyan rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* Lead Capture */}
          {showLeadCapture && (
            <div className="bg-gradient-to-br from-brand-light to-white rounded-2xl p-4 text-sm border border-brand-cyan/20 shadow-sm">
              <p className="text-brand-navy font-semibold mb-1">
                Enjoying our chat?
              </p>
              <p className="text-gray-600 mb-3">
                I can connect you with our team for a personal conversation.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setShowLeadCapture(false);
                  window.location.href = "/contact";
                }}
                className="w-full"
              >
                Schedule a Call
              </Button>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t safe-area-inset-bottom">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
              className="flex-1 rounded-xl text-base"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-xl px-4 min-w-[48px]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </Button>
          </div>
        </form>
      </div>

      {/* Custom animation */}
      <style jsx global>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
