'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ChatSuccess = {
  ok: true;
  provider: string;
  model: string;
  content: string;
};

type ChatFailure = {
  ok: false;
  error: string;
};

type ChatResult = ChatSuccess | ChatFailure;

function isChatResult(value: unknown): value is ChatResult {
  if (typeof value !== 'object' || value === null || !('ok' in value)) return false;
  const candidate = value as { ok?: unknown };
  return typeof candidate.ok === 'boolean';
}

export default function AiGatewayPage() {
  const [prompt, setPrompt] = useState('Say hello from Opsly AI Gateway.');
  const [model, setModel] = useState('');
  const [result, setResult] = useState<ChatResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendPrompt() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.trim() || undefined,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const body = (await res.json().catch(() => null)) as unknown;
      if (isChatResult(body)) {
        setResult(body);
      } else {
        setResult({ ok: false, error: `Unexpected response (HTTP ${res.status})` });
      }
    } catch (error) {
      setResult({ ok: false, error: error instanceof Error ? error.message : 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-lg text-ops-green">ai-gateway</h1>
        <p className="mt-2 max-w-3xl text-sm text-ops-gray">
          Test interno del Opsly AI Gateway. Las API keys viven solo en el servidor; el navegador llama
          a <span className="font-mono text-ops-cyan">/api/ai/chat</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>NVIDIA Build / NIM chat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm text-ops-gray">Prompt</span>
            <textarea
              className="min-h-[180px] w-full rounded-md border border-ops-border bg-black/40 p-3 font-mono text-sm text-neutral-100 outline-none focus:border-ops-cyan"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              maxLength={12000}
            />
          </label>

          <label className="block max-w-xl space-y-2">
            <span className="text-sm text-ops-gray">Model override (opcional)</span>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="meta/llama-3.1-8b-instruct"
            />
          </label>

          <Button onClick={sendPrompt} disabled={loading || prompt.trim().length === 0}>
            {loading ? 'Sending…' : 'Send'}
          </Button>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>{result.ok ? 'Response' : 'Error'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.ok ? (
              <>
                <div className="text-xs text-ops-gray">
                  provider=<span className="font-mono text-ops-cyan">{result.provider}</span>{' '}
                  model=<span className="font-mono text-ops-cyan">{result.model}</span>
                </div>
                <pre className="whitespace-pre-wrap rounded-md border border-ops-border bg-black/40 p-4 text-sm text-neutral-100">
                  {result.content}
                </pre>
              </>
            ) : (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {result.error}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
