import Link from 'next/link';
import { listCollectionItems } from '@/lib/collection';
import { getTeams } from '@/lib/data/repos';
import {
  calculateTeamScores,
  headToHead,
  getGroupTeams,
  flagEmoji,
  GROUPS,
  type TeamScore,
  TEAMS,
} from '@/lib/world-cup-data';
import { tournamentWinProbabilities } from '@/lib/predictions/match-model';
import { TopContendersChart, WinProbabilityTable } from '@/app/components/BettingCharts';

export const dynamic = 'force-dynamic';

/** Build collection map per country from sticker collection. */
function buildCollectionMap(items: Array<{ country: string | null }>): Map<string, number> {
  const byCountry = new Map<string, number>();
  for (const item of items) {
    if (item.country) {
      byCountry.set(item.country, (byCountry.get(item.country) ?? 0) + 1);
    }
  }
  return byCountry;
}

export default async function AnalyticsPage() {
  const [items, dbTeams] = await Promise.all([listCollectionItems(), getTeams()]);

  const byCountry = buildCollectionMap(items);

  // Use DB teams if available (live data), otherwise fall back to static TEAMS constant
  const hasDbTeams = dbTeams.length > 0;

  // Compute win probabilities — works with both DB and static data
  let scores: TeamScore[];

  if (hasDbTeams) {
    // Build TeamScore from DB teams + collection bonus
    const maxStickers = Math.max(...byCountry.values(), 1);
    const wcScores = tournamentWinProbabilities(
      dbTeams.map((t) => ({
        name: t.name,
        fifaRank: t.fifaRank ?? 50,
        recentForm: t.recentForm ?? 65,
        wcWins: t.wcWins ?? 0,
        collectionCount: byCountry.get(t.name) ?? 0,
      }))
    );

    scores = wcScores.map((s) => {
      const team = TEAMS.find((t) => t.name === s.name);
      const dbTeam = dbTeams.find((t) => t.name === s.name);
      const owned = byCountry.get(s.name) ?? 0;
      const collectionBonus = maxStickers > 0 ? Math.round((owned / maxStickers) * 20) : 0;
      return {
        team: team ?? {
          name: s.name,
          iso: dbTeam?.iso ?? 'XX',
          fifaRank: dbTeam?.fifaRank ?? 50,
          group: dbTeam?.groupStage ?? '?',
          continent: (dbTeam?.continent as TeamScore['team']['continent']) ?? 'UEFA',
          worldCupWins: dbTeam?.wcWins ?? 0,
          recentForm: dbTeam?.recentForm ?? 65,
        },
        powerScore: s.powerScore,
        collectionBonus,
        winProbability: s.winProbability,
      };
    });
  } else {
    // Static fallback (lib/world-cup-data.ts)
    scores = calculateTeamScores(byCountry);
  }

  const top2 = scores.slice(0, 2) as [TeamScore, TeamScore];
  const finalPrediction = headToHead(top2[0], top2[1]);

  const userFavorites = [...byCountry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-sm text-amber-400 font-medium uppercase tracking-wide">
          Panini Lab · Predicciones Mundial 2026
        </p>
        <h1 className="text-4xl font-bold tracking-tight">🏆 Predicciones del Mundial</h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Predicciones basadas en ranking FIFA, forma reciente y tu colección de figuritas.{' '}
          {hasDbTeams && (
            <span className="text-emerald-400">
              {dbTeams.length} selecciones con datos en tiempo real.
            </span>
          )}
          {byCountry.size > 0 && (
            <span className="text-emerald-400 ml-1">
              Tu colección influye el score de {byCountry.size} selecciones.
            </span>
          )}
        </p>
        <nav className="flex flex-wrap gap-4 text-sm pt-1">
          <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">
            ← Dashboard
          </Link>
          <Link href="/matches" className="text-amber-400 hover:text-amber-300">
            📅 Partidos →
          </Link>
          <Link href="/players" className="text-amber-400 hover:text-amber-300">
            ⭐ Jugadores →
          </Link>
          <Link href="/value" className="text-emerald-400 hover:text-emerald-300 font-medium">
            📈 Value Bets →
          </Link>
        </nav>
      </header>

      {/* Final prediction highlight */}
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-3">
        <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wide">
          🎯 Predicción Final del Torneo
        </h2>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-center flex-1">
            <p className="text-3xl mb-1">{flagEmoji(top2[0].team.iso)}</p>
            <p className="font-bold text-lg">{top2[0].team.name}</p>
            <p className="text-xs text-zinc-400">Power: {top2[0].powerScore}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-zinc-500 text-sm font-mono">VS</p>
          </div>
          <div className="text-center flex-1">
            <p className="text-3xl mb-1">{flagEmoji(top2[1].team.iso)}</p>
            <p className="font-bold text-lg">{top2[1].team.name}</p>
            <p className="text-xs text-zinc-400">Power: {top2[1].powerScore}</p>
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-amber-400">
            {flagEmoji(
              scores.find((s) => s.team.name === finalPrediction.winner)?.team.iso ?? 'AR'
            )}{' '}
            {finalPrediction.winner}
          </p>
          <p className="text-sm text-zinc-400">
            {finalPrediction.label} · {finalPrediction.prob}% probabilidad de ganar el torneo
          </p>
        </div>
        <div className="text-center pt-2">
          <Link
            href="/value"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            📈 Ver oportunidades en Polymarket
          </Link>
        </div>
      </section>

      {/* Power Rankings chart */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-lg font-medium">📊 Top 10 — Power Score</h2>
        <p className="text-zinc-500 text-xs">
          Fórmula: Ranking FIFA (40%) + Forma reciente (35%) + Experiencia WC (15%) + Tu colección
          (10%)
        </p>
        <TopContendersChart scores={scores} />
      </section>

      {/* Win probability */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-lg font-medium">🏅 Probabilidad de ganar el Mundial</h2>
        <WinProbabilityTable scores={scores} />
      </section>

      {/* Groups */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <h2 className="text-lg font-medium">🗺️ Grupos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GROUPS.map((group) => {
            const teams = getGroupTeams(group);
            const groupScores = scores.filter((s) => s.team.group === group);
            const leader = [...groupScores].sort((a, b) => b.powerScore - a.powerScore)[0];
            return (
              <div key={group} className="rounded-lg border border-zinc-800 p-3 space-y-2">
                <p className="font-bold text-xs text-zinc-400">Grupo {group}</p>
                {teams.map((t) => {
                  const isLeader = leader?.team.name === t.name;
                  return (
                    <div
                      key={t.name}
                      className={`flex items-center gap-2 text-xs ${isLeader ? 'text-emerald-400 font-medium' : 'text-zinc-400'}`}
                    >
                      <span>{flagEmoji(t.iso)}</span>
                      <span className="truncate">{t.name}</span>
                      {byCountry.has(t.name) && <span className="ml-auto text-emerald-600">★</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-zinc-600">★ = tienes figuritas de esa selección</p>
      </section>

      {/* User bias */}
      {userFavorites.length > 0 && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
          <h2 className="text-lg font-medium">❤️ Tus selecciones favoritas (por colección)</h2>
          <p className="text-zinc-500 text-sm">
            Basado en cuántas figuritas tienes de cada selección — tu &ldquo;apuesta
            emocional&rdquo;.
          </p>
          <div className="flex flex-wrap gap-3">
            {userFavorites.map(([country, count]) => {
              const team = scores.find((s) => s.team.name === country);
              return (
                <div
                  key={country}
                  className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm"
                >
                  <span className="text-lg">{flagEmoji(team?.team.iso ?? 'XX')}</span>
                  <span className="font-medium">{country}</span>
                  <span className="text-zinc-500">{count} 🃏</span>
                  {team && (
                    <span className="text-xs text-emerald-400 ml-1">
                      #{team.team.fifaRank} FIFA
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-zinc-700">
        Predicciones con fines de entretenimiento. Grupos simulados — draw oficial FIFA 2026 puede
        diferir. No constituye consejo de apuestas. Solo para mayores de 18 años.
      </p>
    </main>
  );
}
