import Link from 'next/link';
import { headers } from 'next/headers';
import { getTeams, getTopValueSignals, getActiveMarkets } from '@/lib/data/repos';
import { fetchWorldCupMarkets } from '@/lib/polymarket/client';
import {
  computeEdge,
  filterValueSignals,
  type ComputedEdge,
  type SignalType,
} from '@/lib/polymarket/edge';
import { tournamentWinProbabilities } from '@/lib/predictions/match-model';
import { isRestricted } from '@/lib/affiliate';
import ValueBetCard from '@/app/components/ValueBetCard';

export const dynamic = 'force-dynamic';

/** Map signal type to display label + color */
function signalDisplay(signal: SignalType): { label: string; cls: string } {
  const map: Record<SignalType, { label: string; cls: string }> = {
    strong_value: {
      label: '🔥 Value Fuerte',
      cls: 'text-emerald-400 bg-emerald-950 border-emerald-800',
    },
    value: { label: '✅ Value', cls: 'text-lime-400 bg-lime-950 border-lime-800' },
    fair: { label: '⚖️ Justo', cls: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
    overpriced: { label: '⚠️ Caro', cls: 'text-red-400 bg-red-950 border-red-800' },
  };
  return map[signal];
}

export default async function ValuePage(): Promise<React.ReactElement> {
  // Geo-restriction check (server-side)
  const headerList = await headers();
  const country = headerList.get('cf-ipcountry') ?? headerList.get('x-country-code') ?? null;
  const restricted = isRestricted(country);

  // Load our model data
  const dbTeams = await getTeams();

  // Compute tournament win probabilities from our model
  const ourPredictions = tournamentWinProbabilities(
    dbTeams.map((t) => ({
      name: t.name,
      fifaRank: t.fifaRank ?? 50,
      recentForm: t.recentForm ?? 65,
      wcWins: t.wcWins ?? 0,
    }))
  );
  const probByTeam = new Map(ourPredictions.map((p) => [p.name, p.winProbability]));

  // Fetch live Polymarket markets
  const [liveMarkets, cachedSignals, cachedMarkets] = await Promise.all([
    fetchWorldCupMarkets(),
    getTopValueSignals(30),
    getActiveMarkets(),
  ]);

  // Compute live edges from Polymarket
  const liveEdges: ComputedEdge[] = [];

  for (const market of liveMarkets) {
    // Try to match market to a team
    const q = market.question.toLowerCase();
    let ourProb: number | null = null;

    for (const [teamName, prob] of probByTeam) {
      if (q.includes(teamName.toLowerCase())) {
        ourProb = prob;
        break;
      }
    }

    if (ourProb === null) continue; // skip markets we can't map to our model

    const edge = computeEdge({ market, ourProbPct: ourProb });
    if (edge) liveEdges.push(edge);
  }

  // Also show cached signals from DB
  const allSignals = liveEdges.length > 0 ? liveEdges : [];
  const valueSignals = filterValueSignals(allSignals);
  const fairMarkets = allSignals.filter((e) => e.signal === 'fair').slice(0, 5);

  const hasLiveData = liveMarkets.length > 0;
  const hasCached = cachedSignals.length > 0;
  void cachedMarkets;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-sm text-emerald-400 font-medium uppercase tracking-wide">
          Panini Lab · Value Bets
        </p>
        <h1 className="text-4xl font-bold tracking-tight">📈 Oportunidades en Polymarket</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Comparamos las probabilidades de nuestro modelo con los precios del mercado Polymarket.
          Cuando nuestra probabilidad es mayor que la del mercado, hay{' '}
          <span className="text-emerald-400 font-medium">edge positivo</span> — un posible valor.
        </p>
        <nav className="flex flex-wrap gap-4 text-sm pt-1">
          <Link href="/analytics" className="text-zinc-500 hover:text-zinc-300">
            ← Predicciones
          </Link>
          <Link href="/matches" className="text-amber-400 hover:text-amber-300">
            📅 Partidos
          </Link>
          <Link href="/players" className="text-amber-400 hover:text-amber-300">
            ⭐ Jugadores
          </Link>
        </nav>
      </header>

      {/* Geo-restriction banner */}
      {restricted && (
        <section className="rounded-xl border border-red-800 bg-red-950 p-5 space-y-2">
          <h2 className="text-red-400 font-semibold">🚫 No disponible en tu región</h2>
          <p className="text-red-300 text-sm">
            Polymarket no está disponible para usuarios en tu país (
            {country ?? 'región desconocida'}). Puedes ver las predicciones de nuestro modelo, pero
            los links a Polymarket están desactivados.
          </p>
        </section>
      )}

      {/* 18+ disclaimer */}
      <section className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-semibold text-zinc-400 text-sm">⚠️ Aviso importante</p>
        <p>
          Predicciones para entretenimiento e información únicamente. No constituyen consejo de
          inversión ni de apuestas. Las apuestas implican riesgo de pérdida. Solo para mayores de 18
          años. Juega responsablemente.
        </p>
        <p>
          Panini Lab es una herramienta de análisis. Polymarket es una plataforma de predicción
          independiente. No somos responsables de transacciones realizadas en plataformas de
          terceros.
        </p>
      </section>

      {/* Value signals */}
      {valueSignals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium">🔥 Oportunidades detectadas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {valueSignals.map((signal) => (
              <ValueBetCard
                key={signal.conditionId}
                signal={signal}
                signalDisplay={signalDisplay(signal.signal)}
                restricted={restricted}
              />
            ))}
          </div>
        </section>
      )}

      {/* Fair markets */}
      {fairMarkets.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-base font-medium text-zinc-400">⚖️ Mercados en precio justo</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {fairMarkets.map((signal) => (
              <ValueBetCard
                key={signal.conditionId}
                signal={signal}
                signalDisplay={signalDisplay(signal.signal)}
                restricted={restricted}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {/* No live data state */}
      {!hasLiveData && !hasCached && (
        <section className="rounded-xl border border-dashed border-zinc-700 p-8 text-center space-y-3">
          <p className="text-3xl">📡</p>
          <h2 className="text-lg font-medium text-zinc-300">Conectando con Polymarket…</h2>
          <p className="text-zinc-500 text-sm max-w-md mx-auto">
            Los mercados del Mundial 2026 en Polymarket se activan a medida que el torneo se acerca.
            Vuelve a revisar cuando comiencen a publicarse.
          </p>
          <p className="text-zinc-600 text-xs">El Mundial 2026 arranca el 11 de junio de 2026.</p>
          <Link
            href="https://polymarket.com/search?q=world+cup+2026"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-emerald-500 hover:text-emerald-400 mt-2"
          >
            Ver mercados actuales en Polymarket →
          </Link>
        </section>
      )}

      {/* Edge explanation */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-3">
        <h2 className="text-base font-medium">¿Cómo funciona el edge?</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-zinc-400">
          <div className="space-y-2">
            <p>
              <span className="text-emerald-400 font-medium">Nuestro modelo</span> usa ranking FIFA,
              forma reciente, historial de Mundiales y la colección de figuritas del usuario para
              calcular probabilidades.
            </p>
            <p>
              <span className="text-amber-400 font-medium">El mercado Polymarket</span> refleja las
              apuestas de miles de usuarios con sus propias probabilidades implícitas.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <span className="text-emerald-400 font-medium">Edge positivo</span> significa que
              nuestro modelo le asigna más probabilidad que el mercado. Si el modelo es correcto, el
              pago de Polymarket sería superior al riesgo implícito.
            </p>
            <p className="text-zinc-600 text-xs">
              Los modelos de predicción no son infalibles. Las apuestas conllevan riesgo real.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 pt-2">
          {(Object.keys(signalDisplay) as SignalType[]).map((s) => {
            const { label, cls } = signalDisplay(s);
            return (
              <div key={s} className={`rounded-lg border px-3 py-2 text-xs text-center ${cls}`}>
                {label}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
