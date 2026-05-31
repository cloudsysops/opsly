'use client';

import { useState } from 'react';
import type { ComputedEdge } from '@/lib/polymarket/edge';

interface ValueBetCardProps {
  signal: ComputedEdge;
  signalDisplay: { label: string; cls: string };
  restricted: boolean;
  compact?: boolean;
}

export default function ValueBetCard({
  signal,
  signalDisplay,
  restricted,
  compact = false,
}: ValueBetCardProps): React.ReactElement {
  const [loading, setLoading] = useState(false);

  async function handleClick(): Promise<void> {
    if (restricted || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/affiliate/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationUrl: signal.polymarketUrl,
          signalId: signal.conditionId,
        }),
      });
      const data = (await res.json()) as { ok: boolean; url?: string };
      if (data.ok && data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setLoading(false);
    }
  }

  const edgeColor =
    signal.edge > 8
      ? 'text-emerald-400'
      : signal.edge > 4
        ? 'text-lime-400'
        : signal.edge >= -4
          ? 'text-zinc-400'
          : 'text-red-400';

  return (
    <div className={`rounded-xl border ${signalDisplay.cls} p-4 space-y-3`}>
      {/* Question */}
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug ${compact ? 'text-zinc-300' : 'text-zinc-100'}`}>
          {signal.question}
        </p>
        <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded-full border ${signalDisplay.cls}`}>
          {signalDisplay.label}
        </span>
      </div>

      {/* Probabilities */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-zinc-500">Nuestro modelo</p>
          <p className="text-lg font-bold tabular-nums">{signal.ourProb}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Edge</p>
          <p className={`text-lg font-bold tabular-nums ${edgeColor}`}>
            {signal.edge > 0 ? '+' : ''}{signal.edge}pp
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Mercado</p>
          <p className="text-lg font-bold tabular-nums text-zinc-400">{signal.marketImplied}%</p>
        </div>
      </div>

      {/* Volume */}
      {signal.volumeUsdc > 0 && (
        <p className="text-xs text-zinc-600">
          Vol: ${signal.volumeUsdc.toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC
          {signal.closesAt && (
            <> · Cierra: {new Date(signal.closesAt).toLocaleDateString('es-CO')}</>
          )}
        </p>
      )}

      {/* CTA */}
      {restricted ? (
        <p className="text-xs text-red-500 text-center">No disponible en tu región</p>
      ) : (
        <button
          onClick={() => void handleClick()}
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>📈 Apostar en Polymarket</>
          )}
        </button>
      )}

      <p className="text-xs text-zinc-700 text-center">
        18+ · Juega responsablemente · Solo información
      </p>
    </div>
  );
}
