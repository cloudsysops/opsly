"use client";

import { useCallback, useState } from "react";
import {
  getOllamaDemoJob,
  postOllamaDemo,
  type OllamaDemoJobStatus,
} from "@/lib/api-client";

const DEFAULT_TENANT = "localrank";

export default function WorkersOllamaPage() {
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_TENANT);
  const [prompt, setPrompt] = useState(
    "Explain what a BullMQ worker does in one sentence.",
  );
  const [taskType, setTaskType] = useState<
    "analyze" | "generate" | "review" | "summarize"
  >("summarize");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<OllamaDemoJobStatus | null>(null);

  const enqueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await postOllamaDemo({
        tenant_slug: tenantSlug.trim(),
        prompt: prompt.trim(),
        task_type: taskType,
      });
      const id =
        typeof res.job_id === "string" && res.job_id.length > 0
          ? res.job_id
          : null;
      setJobId(id);
      if (id) {
        const s = await getOllamaDemoJob(id);
        setStatus(s);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, prompt, taskType]);

  const refreshStatus = useCallback(async () => {
    if (!jobId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await getOllamaDemoJob(jobId);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-2 font-mono text-xl font-semibold text-ops-green">
        Workers — Ollama (demo)
      </h1>
      <p className="mb-6 text-sm text-neutral-400">
        Encola un job en el orchestrator: worker → LLM Gateway{" "}
        <code className="text-neutral-300">/v1/text</code> → cadena cheap (Ollama
        si está sano). El uso se registra en{" "}
        <code className="text-neutral-300">usage_events</code> y métricas Redis.
      </p>

      <div className="mb-4 space-y-3 rounded border border-ops-border bg-ops-surface p-4">
        <label
          htmlFor="ollama-demo-tenant"
          className="block text-xs uppercase text-neutral-500"
        >
          Tenant slug
        </label>
        <input
          id="ollama-demo-tenant"
          name="tenant_slug"
          autoComplete="off"
          placeholder="localrank"
          className="w-full rounded border border-ops-border bg-black/40 px-3 py-2 font-mono text-sm text-neutral-200"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
        />
        <label
          htmlFor="ollama-demo-task"
          className="block text-xs uppercase text-neutral-500"
        >
          Task type
        </label>
        <select
          id="ollama-demo-task"
          name="task_type"
          className="w-full rounded border border-ops-border bg-black/40 px-3 py-2 text-sm text-neutral-200"
          value={taskType}
          onChange={(e) =>
            setTaskType(e.target.value as typeof taskType)
          }
        >
          <option value="summarize">summarize</option>
          <option value="analyze">analyze</option>
          <option value="generate">generate</option>
          <option value="review">review</option>
        </select>
        <label
          htmlFor="ollama-demo-prompt"
          className="block text-xs uppercase text-neutral-500"
        >
          Prompt
        </label>
        <textarea
          id="ollama-demo-prompt"
          name="prompt"
          placeholder="Texto a procesar"
          className="min-h-[100px] w-full rounded border border-ops-border bg-black/40 px-3 py-2 font-mono text-sm text-neutral-200"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void enqueue()}
          className="rounded bg-ops-green px-4 py-2 font-mono text-sm font-medium text-black hover:bg-ops-green/90 disabled:opacity-50"
        >
          {loading ? "…" : "Enqueue job"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {jobId ? (
        <div className="mb-4 rounded border border-ops-border bg-ops-surface p-4 font-mono text-sm">
          <div className="text-neutral-400">job_id</div>
          <div className="break-all text-ops-green">{jobId}</div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refreshStatus()}
            className="mt-3 rounded border border-ops-border px-3 py-1 text-xs text-neutral-300 hover:bg-ops-border/40"
          >
            Refresh status
          </button>
        </div>
      ) : null}

      {status ? (
        <pre className="overflow-x-auto rounded border border-ops-border bg-black/50 p-4 font-mono text-xs text-neutral-300">
          {JSON.stringify(status, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
