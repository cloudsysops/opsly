"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  PaperAirplaneIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function renderMessageContent(content: string): ReactNode {
  const elements: ReactNode[] = [];
  const lines = content.split("\n");
  let key = 0;

  lines.forEach((line, lineIndex) => {
    const strippedLine = line.replace(/^#{1,4}\s+/, "");
    if (strippedLine !== line) {
      line = strippedLine;
    }

    if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} className="ml-4 list-disc">
          {parseInlineFormatting(line.slice(2))}
        </li>
      );
      return;
    }

    const numberedMatch = line.match(/^(\d+)\. (.+)$/);
    if (numberedMatch) {
      elements.push(
        <li key={key++} className="ml-4 list-decimal">
          {parseInlineFormatting(numberedMatch[2])}
        </li>
      );
      return;
    }

    if (line.trim()) {
      elements.push(
        <p key={key++} className={lineIndex > 0 ? "mt-2" : ""}>
          {parseInlineFormatting(line)}
        </p>
      );
    } else if (lineIndex > 0) {
      elements.push(<br key={key++} />);
    }
  });

  return <>{elements}</>;
}

function parseInlineFormatting(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    if (boldMatch && (!linkMatch || boldMatch.index! <= linkMatch.index!)) {
      if (boldMatch.index! > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index! + boldMatch[0].length);
    } else if (linkMatch) {
      if (linkMatch.index! > 0) {
        parts.push(remaining.slice(0, linkMatch.index));
      }
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-purple hover:text-brand-navy underline"
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index! + linkMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export default function EarlCoachWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [moduleContext, setModuleContext] = useState<{ title: string; description: string | null } | null>(null);
  const [pageContext, setPageContext] = useState<{ title: string; description: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll: for assistant messages, scroll to the TOP of the response so the user can read it.
  // For user messages (short), scroll to bottom.
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "assistant" && lastAssistantRef.current) {
      lastAssistantRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Listen for page context broadcasts (e.g. wiki article pages)
  useEffect(() => {
    const handlePageContext = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.title) {
        setPageContext({ title: detail.title, description: detail.description || null });
      } else {
        setPageContext(null);
      }
    };
    window.addEventListener("earl-page-context", handlePageContext);
    return () => window.removeEventListener("earl-page-context", handlePageContext);
  }, []);

  // Listen for open requests from other components (e.g. sidebar "Ask AI Coach" button, wiki "Ask Earl" CTA)
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.moduleTitle) {
        setModuleContext({ title: detail.moduleTitle, description: detail.moduleDescription || null });
      }
      setIsOpen(true);
    };
    window.addEventListener("earl-coach-open", handleOpen);
    return () => window.removeEventListener("earl-coach-open", handleOpen);
  }, []);

  // Use explicit moduleContext if set, otherwise fall back to page context (e.g. wiki article)
  const effectiveContext = moduleContext || pageContext;

  const suggestedQuestions = effectiveContext
    ? [
        `Help me understand "${effectiveContext.title}"`,
        "What should I focus on for this task?",
        "How does this fit into my 90-day plan?",
        "Can you give me tips to complete this faster?",
      ]
    : [
        "What should I be working on right now?",
        "How is my franchise onboarding going?",
        "What resources are available to me?",
        "Can you explain the 90-day plan?",
      ];

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        message: text,
        conversationId,
      };
      if (effectiveContext) {
        body.moduleContext = effectiveContext;
      }

      const response = await fetch("/api/bootcamp/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setConversationId(data.conversationId);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Please try again or reach out to the STC team directly.",
        timestamp: new Date(),
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

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setModuleContext(null);
    // Don't clear pageContext — it's driven by the current page, not the conversation
  }

  return (
    <>
      {/* Floating Chat Button */}
      <div
        className={`fixed bottom-20 right-6 z-50 transition-all duration-300 ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="group relative h-14 w-14 rounded-full bg-gradient-to-br from-brand-navy to-brand-purple text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
        >
          <span className="sr-only">Chat with Earl</span>
          <Image
            src="/images/characters/mascot.svg"
            alt="Earl"
            width={40}
            height={40}
            className="absolute inset-0 m-auto h-9 w-9 object-contain drop-shadow-sm"
          />
        </button>
      </div>

      {/* Chat Popup — fixed bottom-right */}
      <div
        className={`fixed z-50 bg-white shadow-2xl transition-all duration-300 overflow-hidden
          bottom-0 right-0 sm:bottom-20 sm:right-6
          w-full sm:w-[380px] sm:max-w-[calc(100vw-48px)]
          h-[100dvh] sm:h-auto sm:max-h-[min(600px,calc(100vh-96px))] sm:rounded-2xl
          flex flex-col
          ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-navy to-brand-purple flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="h-10 w-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <Image
                  src="/images/characters/mascot.svg"
                  alt="Earl"
                  width={28}
                  height={28}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-brand-green rounded-full border-2 border-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white">Earl — AI Coach</h3>
              {effectiveContext ? (
                <p className="text-[11px] text-white/70 truncate max-w-[180px]">
                  {effectiveContext.title}
                </p>
              ) : (
                <p className="text-[11px] text-white/70">Your franchise assistant</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {messages.length > 0 && (
              <button
                onClick={startNewConversation}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="New conversation"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-0 sm:h-96">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6">
              <div className="text-center max-w-sm mx-auto">
                <div className="inline-block p-3 bg-white rounded-2xl shadow-sm mb-3">
                  <Image
                    src="/images/characters/mascot.svg"
                    alt="Earl"
                    width={56}
                    height={56}
                    className="h-14 w-14 mx-auto"
                  />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Hi{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {effectiveContext ? (
                    <>I can help you with <span className="font-medium text-brand-navy">{effectiveContext.title}</span>. Ask me anything!</>
                  ) : (
                    <>I&apos;m your AI coach. Ask me anything about your franchise journey!</>
                  )}
                </p>

                <div className="space-y-2">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-sm px-3 py-2.5 rounded-xl bg-white hover:bg-brand-light border border-gray-200 hover:border-brand-cyan text-gray-700 hover:text-brand-navy transition-all shadow-sm"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, idx) => {
                // Attach ref to the last assistant message so we can scroll to its top
                const isLastAssistant =
                  message.role === "assistant" &&
                  idx === messages.length - 1;
                return (
                <div
                  key={message.id}
                  ref={isLastAssistant ? lastAssistantRef : undefined}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 mr-2">
                      <div className="h-7 w-7 bg-brand-light rounded-full flex items-center justify-center">
                        <Image
                          src="/images/characters/mascot.svg"
                          alt="Earl"
                          width={20}
                          height={20}
                          className="h-4 w-4"
                        />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      message.role === "user"
                        ? "bg-brand-navy text-white rounded-br-md"
                        : "bg-white text-gray-700 rounded-bl-md"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="text-sm leading-relaxed">
                        {renderMessageContent(message.content)}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1.5 ${
                        message.role === "user" ? "text-white/60" : "text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 ml-2">
                      <div className="h-7 w-7 bg-brand-purple/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-brand-purple">
                          {session?.user?.name?.[0] || "U"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                ); })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex-shrink-0 mr-2">
                    <div className="h-7 w-7 bg-brand-light rounded-full flex items-center justify-center">
                      <Image
                        src="/images/characters/mascot.svg"
                        alt="Earl"
                        width={20}
                        height={20}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-sm">
                    <div className="flex gap-1.5">
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
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Earl anything..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-3 py-2.5 bg-brand-navy text-white rounded-xl hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
