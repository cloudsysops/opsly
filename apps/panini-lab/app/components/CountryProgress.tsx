import { countryToFlag, COUNTRY_ALIASES } from '@/lib/parse-collection';
import type { CollectionItemRow, CollectionStatus } from '@/lib/memory-store';

interface CountrySummary {
  country: string;
  flag: string;
  owned: number;
  duplicate: number;
  missing: number;
  total: number;
}

function flagForCountry(name: string): string {
  const code = COUNTRY_ALIASES[name.toLowerCase()];
  return code ? countryToFlag(code) : '🏳';
}

function buildSummaries(items: CollectionItemRow[]): CountrySummary[] {
  const map = new Map<string, { owned: number; duplicate: number; missing: number; total: number }>();

  for (const item of items) {
    const key = item.country ?? 'Sin país';
    const current = map.get(key) ?? { owned: 0, duplicate: 0, missing: 0, total: 0 };
    current.total += 1;
    if (item.status === 'owned') current.owned += 1;
    else if (item.status === 'duplicate') current.duplicate += 1;
    else if (item.status === 'missing' || item.status === 'want') current.missing += 1;
    map.set(key, current);
  }

  return [...map.entries()]
    .map(([country, counts]) => ({
      country,
      flag: country === 'Sin país' ? '🏳' : flagForCountry(country),
      ...counts,
    }))
    .sort((a, b) => b.owned - a.owned);
}

export default function CountryProgress({ items }: { items: CollectionItemRow[] }) {
  const summaries = buildSummaries(items.filter((i) => i.country !== null));
  const noCountry = items.filter((i) => i.country === null).length;

  if (summaries.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        Aún no hay figuritas con país. Di &ldquo;la 10 de Colombia&rdquo; al registrar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {summaries.map((s) => (
        <div key={s.country} className="flex items-center gap-3 text-sm">
          <span className="text-xl w-8 text-center">{s.flag}</span>
          <span className="w-28 font-medium truncate">{s.country}</span>
          <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.round((s.owned / Math.max(s.total, 1)) * 100)}%` }}
            />
          </div>
          <span className="text-zinc-400 tabular-nums text-xs w-24 text-right">
            {s.owned} ✅ {s.duplicate > 0 ? `· ${s.duplicate} 🔁` : ''}{' '}
            {s.missing > 0 ? `· ${s.missing} ❌` : ''}
          </span>
        </div>
      ))}
      {noCountry > 0 && (
        <p className="text-zinc-600 text-xs pt-1">{noCountry} figurita(s) sin país asignado</p>
      )}
    </div>
  );
}

export type { CountrySummary, CollectionStatus };
