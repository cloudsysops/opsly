'use client';

import { useCallback, useState } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBaseUrl } from '@/lib/api-client';
import { getSessionAuthToken } from '@/lib/session-auth';

type HermesMode = 'review' | 'plan' | 'debug' | 'security' | 'research';

type HermesRunOk = {
  ok: true;
  agent: string;
  provider: string;
  model: string;
  result: string;
};

type HermesRunErr = {
  ok: false;
  error: string;
};

type HermesRunResponse = HermesRunOk | HermesRunErr;

export default function HermesAgentPage() {
  const [task, setTask] = useState('');
  const [context, setContext] = useState('');
  const [mode, setMode] = useState<HermesMode>('security');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runHermes = useCallback(async () => {
    setError(null);
    setResult(null);
    setMeta(null);
    const trimmed = task.trim();
    if (trimmed.length === 0) {
      setError('La tarea no puede estar vacía.');
      return;
    }
    setLoading(true);
    try {
      const token = await getSessionAuthToken();
      if (token === null || token.length === 0) {
        setError('Sesión admin requerida (inicia sesión en Opsly Admin).');
        return;
      }
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/agents/hermes/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: trimmed,
          context: context.trim() || undefined,
          mode,
          model: model.trim() || undefined,
        }),
      });
      const data = (await res.json()) as HermesRunResponse;
      if (!data.ok) {
        setError(data.error ?? 'Error desconocido');
        return;
      }
      setMeta({ provider: data.provider, model: data.model });
      setResult(data.result);
    } catch {
      setError('No se pudo contactar la API.');
    } finally {
      setLoading(false);
    }
  }, [task, context, mode, model]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 text-ops-text">
      <div className="flex items-center gap-3">
        <Bot className="h-8 w-8 text-ops-cyan" aria-hidden />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide">Hermes</h1>
          <p className="text-sm text-ops-muted">
            Análisis vía AI Gateway interno (NVIDIA u otro proveedor en servidor). Sin claves en el
            navegador.
          </p>
        </div>
      </div>

      <div className="holo-border neon-glow space-y-4 rounded-xl bg-ops-surface/80 p-6">
        <div>
          <label htmlFor="hermes-task" className="text-xs font-mono text-ops-gray">
            Tarea
          </label>
          <textarea
            id="hermes-task"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
            placeholder="Describe la tarea o el código a revisar…"
            className="mt-2 w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-3 font-mono text-sm text-neutral-200 placeholder-ops-gray focus:border-ops-cyan focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="hermes-context" className="text-xs font-mono text-ops-gray">
            Contexto (opcional)
          </label>
          <textarea
            id="hermes-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="Logs, enlaces, restricciones…"
            className="mt-2 w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-3 font-mono text-sm text-neutral-200 placeholder-ops-gray focus:border-ops-cyan focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="text-xs font-mono text-ops-gray">Modo</span>
            <Select value={mode} onValueChange={(v) => setMode(v as HermesMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="review">review</SelectItem>
                <SelectItem value="plan">plan</SelectItem>
                <SelectItem value="debug">debug</SelectItem>
                <SelectItem value="security">security</SelectItem>
                <SelectItem value="research">research</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="hermes-model" className="text-xs font-mono text-ops-gray">
              Modelo (opcional)
            </label>
            <Input
              id="hermes-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Default desde env (NVIDIA)"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <Button type="button" onClick={() => void runHermes()} disabled={loading}>
          {loading ? 'Ejecutando…' : 'Run Hermes'}
        </Button>
        {error !== null ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {meta !== null ? (
          <p className="font-mono text-xs text-ops-muted">
            provider={meta.provider} model={meta.model}
          </p>
        ) : null}
        {result !== null ? (
          <div className="space-y-2">
            <span className="text-xs font-mono text-ops-gray">Resultado</span>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg border border-ops-border bg-black/40 p-4 font-mono text-sm">
              {result}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
