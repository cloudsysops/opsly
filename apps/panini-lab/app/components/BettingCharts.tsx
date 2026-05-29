'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { TeamScore } from '@/lib/world-cup-data';
import { flagEmoji } from '@/lib/world-cup-data';

// ── Top contenders bar chart ──────────────────────────────────────────────────

export function TopContendersChart({ scores }: { scores: TeamScore[] }) {
  const data = scores.slice(0, 10).map((s) => ({
    team: `${flagEmoji(s.team.iso)} ${s.team.name}`,
    score: s.powerScore,
    bonus: s.collectionBonus,
    winPct: s.winProbability,
  }));

  const colors = ['#f59e0b', '#9ca3af', '#b45309', '#10b981', '#10b981', '#10b981', '#6b7280', '#6b7280', '#6b7280', '#6b7280'];

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: 8, right: 16, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="team"
          stroke="#52525b"
          tick={{ fill: '#a1a1aa', fontSize: 11 }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} domain={[60, 100]} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          cursor={{ fill: '#3f3f46' }}
          formatter={(val, name) =>
            name === 'score' ? [`${val} pts`, 'Power Score'] : [val, String(name)]
          }
          itemStyle={{ color: '#e4e4e7' }}
        />
        <Bar dataKey="score" radius={[4, 4, 0, 0]} name="score">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i] ?? '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Win probability gauge ─────────────────────────────────────────────────────

export function WinProbabilityTable({ scores }: { scores: TeamScore[] }) {
  const top8 = scores.slice(0, 8);
  return (
    <div className="space-y-2">
      {top8.map((s, i) => (
        <div key={s.team.name} className="flex items-center gap-3 text-sm">
          <span className="text-zinc-500 w-5 text-right text-xs">{i + 1}</span>
          <span className="text-xl w-8 text-center">{flagEmoji(s.team.iso)}</span>
          <span className="w-28 font-medium truncate">{s.team.name}</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-2">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (s.winProbability / top8[0]!.winProbability) * 100)}%`,
                background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : '#10b981',
              }}
            />
          </div>
          <span className="text-xs tabular-nums text-zinc-400 w-14 text-right">
            {s.winProbability}%
          </span>
          {s.collectionBonus > 0 && (
            <span className="text-xs text-emerald-500" title="Bonus por tus figuritas">
              +{s.collectionBonus}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
