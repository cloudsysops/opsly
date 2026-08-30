"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  messageCount: number;
}

interface CoachChatProps {
  prospectId: string;
}

// Strip markdown headers from Earl's responses — keep it conversational
function stripMarkdownHeaders(text: string): string {
  return text.replace(/^#{1,4}\s+(.+)$/gm, "**$1**");
}

const suggestedQuestions = [
  "What are the key steps to launching my franchise?",
  "How do I find and enroll my first students?",
  "What marketing strategies work best?",
  "How should I price my classes?",
  "What's the typical school partnership process?",
];

export default function CoachChat({ prospectId }: CoachChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/bootcamp/coach/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/bootcamp/coach/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConversationId(conversationId);
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string; metadata?: { citations?: string[] } }) => ({
            id: m.id,
            role: m.role.toLowerCase() as "user" | "assistant",
            content: m.content,
            citations: m.metadata?.citations,
            timestamp: new Date(m.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const sendMessage = async (messageText: string = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/bootcamp/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText.trim(),
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        citations: data.citations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentConversationId(data.conversationId);

      // Refresh conversations list
      fetchConversations();
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I'm sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Conversation Sidebar */}
      <div
        className={`${
          showSidebar ? "w-64" : "w-0"
        } hidden md:block border-r border-slate-200 bg-slate-50 transition-all duration-300 overflow-hidden`}
      >
        <div className="p-3 border-b border-slate-200">
          <button
            onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            New Chat
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No conversations yet
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    currentConversationId === conv.id
                      ? "bg-brand-navy/10 text-brand-navy"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChatBubbleLeftIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{conv.title || "New conversation"}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-6">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#6A469D] to-brand-navy p-1 mb-4 overflow-hidden">
                <Image
                  src="/images/characters/mascot.svg"
                  alt="Acme Franchise Mascot"
                  width={96}
                  height={96}
                  className="rounded-full"
                />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Hi! I'm Earl, your AI Coach
              </h2>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                I'm here to help you succeed as an Acme Franchisee.
                Ask me anything about operations, marketing, school partnerships, and more!
              </p>

              {/* Suggested Questions */}
              <div className="w-full max-w-lg">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                  Try asking about
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition-colors text-left"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] lg:max-w-[70%] ${
                      message.role === "user"
                        ? "bg-brand-navy text-white rounded-2xl rounded-br-md"
                        : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-md"
                    } px-4 py-3`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                        <Image
                          src="/images/characters/mascot.svg"
                          alt="Earl"
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="text-xs font-semibold text-slate-500">Earl</span>
                      </div>
                    )}
                    <div className={`prose prose-sm max-w-none ${message.role === "user" ? "prose-invert" : ""}`}>
                      <ReactMarkdown>{stripMarkdownHeaders(message.content)}</ReactMarkdown>
                    </div>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {message.citations.map((citation, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]"
                            >
                              {citation}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/images/characters/mascot.svg"
                        alt="Earl"
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-200 p-4 bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Earl anything..."
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy resize-none text-sm"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-brand-navy text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3a3c9e] transition-colors"
              >
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            Earl is an AI assistant. Responses may not always be accurate. For critical decisions, consult with the STC team.
          </p>
        </div>
      </div>
    </div>
  );
}
