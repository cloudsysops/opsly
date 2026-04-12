"use client";

import { getApiBaseUrl } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  decision_type?: string;
}

interface FeedbackChatProps {
  tenantSlug: string;
  userEmail: string;
}

export function FeedbackChat({ tenantSlug, userEmail }: FeedbackChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "👋 Hola! Soy el asistente de Opsly. ¿Tienes algún feedback, error o sugerencia de mejora?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          user_email: userEmail,
          message: userMessage,
          conversation_id: conversationId,
        }),
      });

      const data = (await res.json()) as {
        conversation_id?: string;
        message?: string;
        decision_type?: string | null;
      };
      if (data.conversation_id) setConversationId(data.conversation_id);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message ?? "Sin respuesta",
          decision_type: data.decision_type ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al enviar. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (type?: string) => {
    if (!type) return null;
    const badges: Record<string, { label: string; color: string }> = {
      auto_implement: { label: "⚡ Implementando automáticamente", color: "#22c55e" },
      needs_approval: { label: "⏳ Esperando aprobación", color: "#eab308" },
      scheduled: { label: "📅 Agendado", color: "#3b82f6" },
      rejected: { label: "❌ No aplica", color: "#ef4444" },
    };
    const badge = badges[type];
    if (!badge) return null;
    return (
      <span
        style={{
          fontSize: "11px",
          color: badge.color,
          display: "block",
          marginTop: "4px",
        }}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "#6366f1",
          border: "none",
          cursor: "pointer",
          fontSize: "24px",
          boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label={open ? "Cerrar feedback" : "Abrir feedback"}
      >
        {open ? "✕" : "💬"}
      </button>

      {open ? (
        <div
          style={{
            position: "fixed",
            bottom: "92px",
            right: "24px",
            width: "360px",
            height: "500px",
            background: "#111",
            border: "1px solid #333",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid #222",
              background: "#0a0a0a",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: "#fff",
                fontSize: "14px",
              }}
            >
              💬 Feedback & Sugerencias
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              Tu feedback mejora el producto
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    background: msg.role === "user" ? "#6366f1" : "#1a1a1a",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius:
                      msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: "13px",
                    lineHeight: "1.5",
                  }}
                >
                  {msg.content}
                </div>
                {getDecisionBadge(msg.decision_type)}
              </div>
            ))}
            {loading ? (
              <div
                style={{
                  alignSelf: "flex-start",
                  color: "#666",
                  fontSize: "13px",
                  padding: "8px",
                }}
              >
                Analizando...
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div
            style={{
              padding: "12px",
              borderTop: "1px solid #222",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Escribe tu feedback..."
              style={{
                flex: 1,
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "8px 12px",
                color: "#fff",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: "#6366f1",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "16px",
                opacity: loading || !input.trim() ? 0.5 : 1,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
