"use client";

import { useCallback, useState } from "react";
import { BookOpen } from "lucide-react";

import { getSessionAuthToken } from "@/lib/session-auth";

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (base && base.length > 0) {
    return base.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname.startsWith("admin.")) {
    return `https://api.${window.location.hostname.slice("admin.".length)}`;
  }
  return "http://127.0.0.1:3000";
}

export default function NotebookLMPage() {
  const [question, setQuestion] = useState(
    "¿Cómo se implementa un worker de BullMQ en Opsly?",
  );
  const [context, setContext] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async () => {
    setError(null);
    setAnswer(null);
    setLoading(true);
    try {
      const token = await getSessionAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`${getBaseUrl()}/api/notebooklm/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; answer?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${String(res.status)}`);
        return;
      }
      setAnswer(data.answer ?? JSON.stringify(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [question, context]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8 text-neutral-200">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-ops-green" />
        <h1 className="font-mono text-xl font-semibold text-ops-green">NotebookLM (Opsly)</h1>
      </div>
      <p className="text-sm text-neutral-400">
        Consulta experimental vía <code className="text-ops-green">notebooklm-py</code> (requiere{" "}
        <code className="text-ops-green">NOTEBOOKLM_ENABLED</code> y runtime Python en la API).
        Ver <code className="text-ops-green">docs/NOTEBOOKLM-INTEGRATION.md</code>.
      </p>
      <label className="block space-y-1">
        <span className="text-xs uppercase text-neutral-500">Pregunta</span>
        <textarea
          className="min-h-[100px] w-full rounded border border-ops-border bg-ops-surface px-3 py-2 font-sans text-sm"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs uppercase text-neutral-500">Contexto opcional</span>
        <textarea
          className="min-h-[80px] w-full rounded border border-ops-border bg-ops-surface px-3 py-2 font-sans text-sm"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Pega un fragmento de ARCHITECTURE.md o un error…"
        />
      </label>
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={loading || question.trim().length === 0}
        className="rounded bg-ops-green px-4 py-2 font-mono text-sm font-medium text-black hover:bg-ops-green/90 disabled:opacity-50"
      >
        {loading ? "Consultando…" : "Consultar"}
      </button>
      {error ? (
        <div className="rounded border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {answer ? (
        <div className="rounded border border-ops-border bg-ops-surface/80 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {answer}
        </div>
      ) : null}
    </div>
  );
}
