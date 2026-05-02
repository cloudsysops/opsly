'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
import { fetchShieldSecrets } from '@/lib/tenant';
import type { ShieldScorePayload, ShieldSecretFinding } from '@/types';

/** Alineado a API: verde si score > 80; amarillo 60–80; rojo < 60 */
function riskBadgeClass(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'green':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    case 'yellow':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    default:
      return 'bg-red-500/20 text-red-400 border-red-500/40';
  }
}

function riskLabel(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'green':
      return 'Bajo';
    case 'yellow':
      return 'Medio';
    default:
      return 'Alto';
  }
}

function ScoreGauge({ score }: { score: number }): ReactElement {
  const pct = Math.min(100, Math.max(0, score));
  const angle = (pct / 100) * 360;
  const stroke = pct > 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-neutral-800"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeDasharray={`${(angle / 360) * 264} 264`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-neutral-500">/ 100</span>
      </div>
    </div>
  );
}

export function ShieldDashboardClient(props: {
  tenantSlug: string;
  initialScore: ShieldScorePayload | null;
}): ReactElement {
  const { tenantSlug, initialScore } = props;
  const [findings, setFindings] = useState<ShieldSecretFinding[] | null>(null);
  const [findingsError, setFindingsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }
      try {
        const res = await fetchShieldSecrets(session.access_token, tenantSlug);
        if (!cancelled) {
          setFindings(res.findings);
        }
      } catch (e) {
        if (!cancelled) {
          setFindingsError(e instanceof Error ? e.message : 'Error al cargar hallazgos');
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const scorePayload = initialScore;
  const currentScore = scorePayload?.current.score ?? 0;
  const risk = scorePayload?.risk_level ?? 'red';
  const breakdown = scorePayload?.current.breakdown ?? {};
  const bySeverity =
    breakdown.by_severity !== undefined && typeof breakdown.by_severity === 'object'
      ? (breakdown.by_severity as Record<string, number>)
      : {};

  const chartData = (scorePayload?.history ?? [])
    .filter((p) => p.score !== null)
    .map((p) => ({
      t: new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: p.score as number,
    }));

  return (
    <div className="space-y-10">
      <section id="score" className="scroll-mt-24 rounded-xl border border-ops-border/80 bg-ops-panel/30 p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center sm:items-start">
            <ScoreGauge score={currentScore} />
            <p className="mt-2 text-center text-sm text-neutral-500 sm:text-left">
              Security score (tiempo real desde último cálculo)
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${riskBadgeClass(risk)}`}
              >
                Riesgo: {riskLabel(risk)}
              </span>
              <Button variant="ghost" size="sm" className="border border-ops-border/80" asChild>
                <Link href="#secrets">Ver detalles — Secretos</Link>
              </Button>
              <Button variant="ghost" size="sm" className="border border-ops-border/80" asChild>
                <Link href="#trend">Ver tendencia 7 días</Link>
              </Button>
            </div>
            {scorePayload === null ? (
              <p className="text-sm text-amber-400/90">
                No se pudo cargar el score. Comprueba que la migración Shield esté aplicada y vuelve a
                intentar.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-ops-gray">Desglose por categoría</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.keys(bySeverity).length === 0 ? (
            <div className="rounded-lg border border-ops-border/60 bg-ops-bg/50 p-4 text-sm text-neutral-500">
              Sin hallazgos abiertos por severidad en el último cálculo.
            </div>
          ) : (
            Object.entries(bySeverity).map(([sev, count]) => (
              <div
                key={sev}
                className="rounded-lg border border-ops-border/60 bg-ops-bg/50 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-neutral-500">{sev}</p>
                <p className="mt-1 font-mono text-2xl text-white">{count}</p>
                <p className="text-xs text-neutral-500">hallazgos abiertos</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section id="trend" className="scroll-mt-24 space-y-4">
        <h2 className="text-sm font-semibold text-ops-gray">Tendencia (7 días)</h2>
        <div className="h-48 rounded-xl border border-ops-border/80 bg-ops-bg/50 p-2">
          {chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-neutral-500">
              Aún no hay historial de score. El cron diario o un escaneo generará puntos.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="t" tick={{ fill: '#737373', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#737373', fontSize: 11 }} width={32} />
                <Tooltip
                  contentStyle={{
                    background: '#171717',
                    border: '1px solid #404040',
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section id="secrets" className="scroll-mt-24 space-y-4">
        <h2 className="text-sm font-semibold text-ops-gray">Hallazgos de secretos</h2>
        {findingsError !== null ? (
          <p className="text-sm text-red-400">{findingsError}</p>
        ) : findings === null ? (
          <p className="text-sm text-neutral-500">Cargando…</p>
        ) : findings.length === 0 ? (
          <p className="text-sm text-neutral-500">No hay hallazgos registrados.</p>
        ) : (
          <ul className="space-y-2">
            {findings.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-ops-border/60 bg-ops-bg/50 px-4 py-3 text-sm"
              >
                <span className="font-mono text-ops-green">{f.secret_type ?? 'unknown'}</span>
                <span className="mx-2 text-neutral-600">·</span>
                <span className="text-neutral-400">{f.severity}</span>
                <span className="mx-2 text-neutral-600">·</span>
                <span className="text-neutral-500">{f.status}</span>
                {f.repo_url !== null ? (
                  <p className="mt-1 truncate text-xs text-neutral-500">{f.repo_url}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
