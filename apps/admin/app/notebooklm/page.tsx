'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QueryResult {
  answer: string;
  sources: string[];
  confidence: number;
  cached: boolean;
  latency_ms?: number;
}

export default function AdminNotebookLmPage() {
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/notebooklm/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          context: context.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || `HTTP ${response.status}`);
        return;
      }

      const data = await response.json();
      if (data.ok) {
        setResult({
          answer: data.answer || '',
          sources: data.sources || [],
          confidence: data.confidence || 0,
          cached: data.cached || false,
          latency_ms: data.latency_ms,
        });
        setQuestion('');
        setContext('');
      } else {
        setError(data.error || 'Query failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">NotebookLM Query Tool</h1>
        <p className="text-xs text-ops-gray">
          Queries the dynamic knowledge base (ROADMAP.md + AGENTS.md)
        </p>
      </div>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader>
          <CardTitle className="font-mono text-sm">Query</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-mono text-ops-gray">Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about Opsly..."
              className="mt-2 w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-3 font-mono text-sm text-neutral-200 placeholder-ops-gray focus:border-ops-green focus:outline-none"
              rows={4}
            />
          </div>

          <div>
            <label className="text-xs font-mono text-ops-gray">Context (optional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context..."
              className="mt-2 w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-3 font-mono text-sm text-neutral-200 placeholder-ops-gray focus:border-ops-green focus:outline-none"
              rows={3}
            />
          </div>

          <button
            onClick={handleQuery}
            disabled={!question.trim() || loading}
            className="w-full rounded border border-ops-green bg-ops-green/10 px-4 py-2 font-mono text-sm text-ops-green disabled:cursor-not-allowed disabled:border-ops-border/60 disabled:bg-transparent disabled:text-ops-gray hover:bg-ops-green/20 disabled:hover:bg-transparent"
          >
            {loading ? 'Querying...' : 'Query'}
          </button>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/50 bg-red-950/20">
          <CardContent className="pt-6">
            <p className="font-mono text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-ops-border bg-ops-surface">
          <CardHeader>
            <CardTitle className="font-mono text-sm">Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-mono text-xs text-ops-gray">Answer</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-200">{result.answer}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Confidence" value={`${Math.round(result.confidence * 100)}%`} />
              <Stat label="Cached" value={result.cached ? 'Yes' : 'No'} />
              {result.latency_ms !== undefined && (
                <Stat label="Latency" value={`${result.latency_ms}ms`} />
              )}
              <Stat label="Sources" value={String(result.sources.length)} />
            </div>

            {result.sources.length > 0 && (
              <div>
                <div className="font-mono text-xs text-ops-gray">Sources</div>
                <ul className="mt-2 space-y-1">
                  {result.sources.map((src, i) => (
                    <li key={i} className="font-mono text-xs text-neutral-300">
                      • {src}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader>
          <CardTitle className="font-mono text-sm">Example Queries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            onClick={() => setQuestion('What are the main objectives for Semana 2?')}
            className="block w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-2 text-left font-mono text-xs text-neutral-300 hover:border-ops-green hover:bg-ops-green/10"
          >
            What are the main objectives for Semana 2?
          </button>
          <button
            onClick={() => setQuestion('What is the status of ADR-024?')}
            className="block w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-2 text-left font-mono text-xs text-neutral-300 hover:border-ops-green hover:bg-ops-green/10"
          >
            What is the status of ADR-024?
          </button>
          <button
            onClick={() => setQuestion('Explain the Ollama local worker architecture')}
            className="block w-full rounded border border-ops-border/60 bg-ops-bg-secondary p-2 text-left font-mono text-xs text-neutral-300 hover:border-ops-green hover:bg-ops-green/10"
          >
            Explain the Ollama local worker architecture
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded border border-ops-border/60 p-2">
      <div className="font-mono text-[10px] text-ops-gray">{label}</div>
      <div className="mt-1 font-mono text-xs text-neutral-200">{value}</div>
    </div>
  );
}
