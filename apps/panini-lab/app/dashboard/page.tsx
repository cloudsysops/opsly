import { listCollectionItems, listRecentConversations } from '@/lib/collection';
import { supabaseConfigured } from '@/lib/supabase';
import CountryProgress from '@/app/components/CountryProgress';
import VoiceInput from '@/app/components/VoiceInput';
import {
  StatusPieChart,
  CountryBarChart,
  ActivityTimeline,
  CompletionRing,
} from '@/app/components/CollectionCharts';
import type { CollectionStatus } from '@/lib/memory-store';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<CollectionStatus, string> = {
  owned: '✅ Tengo',
  duplicate: '🔁 Repetida',
  missing: '❌ Falta',
  want: '🔍 Busco',
};

const STATUS_COLOR: Record<CollectionStatus, string> = {
  owned: 'text-emerald-400',
  duplicate: 'text-yellow-400',
  missing: 'text-red-400',
  want: 'text-blue-400',
};

export default async function DashboardPage() {
  const [items, conversations] = await Promise.all([
    listCollectionItems(),
    listRecentConversations(50),
  ]);

  const owned = items.filter((i) => i.status === 'owned').length;
  const duplicate = items.filter((i) => i.status === 'duplicate').length;
  const missing = items.filter((i) => i.status === 'missing' || i.status === 'want').length;
  const withCountry = items.filter((i) => i.country !== null).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-sm text-emerald-400 font-medium uppercase tracking-wide">
          Opsly Incubator · Mundial 2026
        </p>
        <h1 className="text-4xl font-bold tracking-tight">⚽ Mi Colección</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Gestiona tu colección con voz y texto.{' '}
          <span className="text-zinc-600">
            Storage: {supabaseConfigured() ? 'Supabase (panini_lab)' : 'in-memory (local)'}
          </span>
        </p>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          🏆 Ver predicciones del Mundial →
        </Link>
      </header>

      {/* Stats + completion ring */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-center">
        {[
          { label: 'Total', value: items.length, color: 'text-zinc-100' },
          { label: 'Tengo ✅', value: owned, color: 'text-emerald-400' },
          { label: 'Repetidas 🔁', value: duplicate, color: 'text-yellow-400' },
          { label: 'Faltan ❌', value: missing, color: 'text-red-400' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center"
          >
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </div>
        ))}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 flex justify-center">
          <CompletionRing owned={owned} />
        </div>
      </section>

      {/* BI Charts row */}
      <div className="grid sm:grid-cols-2 gap-6">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
          <h2 className="text-base font-medium">Estado de colección</h2>
          <StatusPieChart items={items} />
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
          <h2 className="text-base font-medium">Figuritas por selección</h2>
          <CountryBarChart items={items} />
        </section>
      </div>

      {/* Activity timeline */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-base font-medium">Actividad diaria</h2>
        <ActivityTimeline conversations={conversations} />
      </section>

      {/* Voice input */}
      <VoiceInput />

      {/* Manual webhook hint */}
      <section className="rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500 font-mono space-y-1">
        <p className="font-semibold text-zinc-400 not-italic font-sans text-sm mb-2">
          Webhook manual (curl / Postman)
        </p>
        <p>POST /api/webhooks/inbound</p>
        <p>{`{ "text": "Tengo la 10 de Colombia y la 45 de Brasil repetida", "sender": "demo" }`}</p>
        <p className="text-zinc-600">Header: x-panini-webhook-secret</p>
      </section>

      {/* Progress by country */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Progreso por selección 🌎</h2>
          <span className="text-xs text-zinc-500">{withCountry} figuritas con país</span>
        </div>
        <CountryProgress items={items} />
      </section>

      {/* Full collection grid */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-lg font-medium">Colección completa ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            Sin figuritas aún. Usa el micrófono o envía un webhook con texto.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li
                key={item.sticker_number}
                className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-zinc-300 w-8 shrink-0">
                    #{item.sticker_number}
                  </span>
                  {item.country && (
                    <span className="text-zinc-500 text-xs truncate">{item.country}</span>
                  )}
                </div>
                <span className={`text-xs shrink-0 ${STATUS_COLOR[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Conversation history */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-lg font-medium">Historial de conversaciones</h2>
        {conversations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay eventos todavía.</p>
        ) : (
          <ul className="space-y-3 max-h-64 overflow-y-auto">
            {conversations.slice(0, 20).map((event) => (
              <li key={event.id} className="border-b border-zinc-800 pb-3 last:border-0">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span className="font-mono">{event.channel}</span>
                  <span>{new Date(event.created_at).toLocaleString('es-CO')}</span>
                </div>
                <p className="text-sm text-zinc-200 truncate">&ldquo;{event.raw_input}&rdquo;</p>
                {event.intent && (
                  <p className="text-xs text-emerald-500 mt-1">intent: {event.intent}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
