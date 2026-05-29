import Link from 'next/link';
import { listCollectionItems, listRecentConversations } from '@/lib/collection';
import { supabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [items, conversations] = await Promise.all([
    listCollectionItems(),
    listRecentConversations(20),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-emerald-400 font-medium">Opsly incubator · demo mode</p>
        <h1 className="text-3xl font-semibold tracking-tight">Panini Lab</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Colección de figuritas vía runtime conversacional. Storage:{' '}
          {supabaseConfigured() ? 'Supabase (panini_lab)' : 'in-memory (local)'}.
        </p>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Inicio
        </Link>
      </header>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-medium mb-3">Colección ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            Sin figuritas aún. Envía un webhook con texto como &quot;Tengo la figurita 45
            repetida&quot;.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <li
                key={item.sticker_number}
                className="flex justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm"
              >
                <span className="font-mono">#{item.sticker_number}</span>
                <span className="text-zinc-400">{item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-medium mb-3">Conversaciones recientes</h2>
        {conversations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No hay eventos todavía.</p>
        ) : (
          <ul className="space-y-3">
            {conversations.map((event) => (
              <li key={event.id} className="border-b border-zinc-800 pb-3 last:border-0">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>{event.channel}</span>
                  <span>{new Date(event.created_at).toLocaleString('es-CO')}</span>
                </div>
                <p className="text-sm">{event.raw_input}</p>
                {event.intent ? (
                  <p className="text-xs text-emerald-500 mt-1">intent: {event.intent}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-zinc-700 p-4 text-xs text-zinc-500 font-mono">
        <p>POST /api/webhooks/inbound</p>
        <p className="mt-1">
          {`{ "text": "Tengo la figurita 12 y 45 repetidas", "sender": "demo" }`}
        </p>
        <p className="mt-1">Header: x-panini-webhook-secret (si PANINI_INBOUND_WEBHOOK_SECRET)</p>
      </section>
    </main>
  );
}
