'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import type { CollectionItemRow } from '@/lib/memory-store';
import type { ConversationEventRow } from '@/lib/memory-store';

// ── Pie: status distribution ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  owned: '#10b981',
  duplicate: '#f59e0b',
  missing: '#ef4444',
  want: '#3b82f6',
};
const STATUS_ES: Record<string, string> = {
  owned: 'Tengo',
  duplicate: 'Repetida',
  missing: 'Falta',
  want: 'Busco',
};

export function StatusPieChart({ items }: { items: CollectionItemRow[] }) {
  const counts: Record<string, number> = { owned: 0, duplicate: 0, missing: 0, want: 0 };
  for (const item of items) {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
  }
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_ES[k] ?? k, value: v, key: k }));

  if (data.length === 0) {
    return <EmptyChart label="Sin figuritas aún" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? '#6b7280'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          labelStyle={{ color: '#a1a1aa' }}
          itemStyle={{ color: '#e4e4e7' }}
        />
        <Legend formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Bar: stickers per country ─────────────────────────────────────────────────

export function CountryBarChart({ items }: { items: CollectionItemRow[] }) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = item.country ?? 'Sin país';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const data = [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([country, count]) => ({ country, count }));

  if (data.length === 0) {
    return <EmptyChart label="Di 'la 10 de Colombia' para agregar figuritas" />;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis type="number" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis
          dataKey="country"
          type="category"
          width={80}
          stroke="#52525b"
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          cursor={{ fill: '#3f3f46' }}
          itemStyle={{ color: '#e4e4e7' }}
        />
        <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Figuritas" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Area: activity timeline ──────────────────────────────────────────────────

export function ActivityTimeline({ conversations }: { conversations: ConversationEventRow[] }) {
  // Group by day
  const dayMap = new Map<string, number>();
  for (const ev of conversations) {
    const day = ev.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const data = [...dayMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({
      day: day.slice(5), // MM-DD
      mensajes: count,
    }));

  if (data.length === 0) {
    return <EmptyChart label="Sin actividad registrada todavía" />;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ left: 0, right: 8 }}>
        <defs>
          <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="day" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
        <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
          itemStyle={{ color: '#e4e4e7' }}
        />
        <Area
          type="monotone"
          dataKey="mensajes"
          stroke="#10b981"
          fill="url(#actGrad)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Completion ring ──────────────────────────────────────────────────────────

const FIFA_2026_TOTAL = 670;

export function CompletionRing({ owned }: { owned: number }) {
  const pct = Math.min(100, Math.round((owned / FIFA_2026_TOTAL) * 100));
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" fill="#e4e4e7" fontSize="18" fontWeight="bold">
          {pct}%
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#71717a" fontSize="9">
          completado
        </text>
      </svg>
      <p className="text-xs text-zinc-500">
        {owned} / {FIFA_2026_TOTAL} figuritas
      </p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm italic">
      {label}
    </div>
  );
}
