/**
 * Sports data API client — API-Football (primary) + football-data.org (fallback).
 *
 * Responsibilities:
 *  - Typed HTTP calls to external API(s)
 *  - No business logic — just fetch + transform to canonical shapes
 *  - All functions return null on failure (callers decide fallback strategy)
 *
 * Env vars required:
 *  - SPORTS_API_KEY   — API-Football key (https://www.api-football.com/)
 *  - FOOTBALL_DATA_API_KEY — football-data.org key (optional, free fallback)
 */

// ── Canonical types returned by this module ────────────────────────────────────

export interface ApiTeam {
  apiId: number;
  name: string;
  shortName: string | null;
  iso: string | null; // ISO alpha-2 country code for flag
  continent: string | null;
  logoUrl: string | null;
}

export interface ApiPlayer {
  apiId: number;
  name: string;
  position: string | null; // 'Goalkeeper'|'Defender'|'Midfielder'|'Attacker'
  nationality: string | null;
  age: number | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  teamApiId: number;
  // season stats
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  shotsTotal: number;
  rating: number | null; // 0–10 float
}

export interface ApiFixture {
  apiId: number;
  homeTeamApiId: number;
  awayTeamApiId: number;
  stage: string; // 'Group A', 'Final', etc.
  matchDate: string; // ISO datetime string
  venue: string | null;
  city: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
}

export interface ApiResult {
  fixtureApiId: number;
  homeGoals: number;
  awayGoals: number;
  winner: 'home' | 'away' | 'draw';
  homeGoalsHt: number | null;
  awayGoalsHt: number | null;
}

// ── FIFA World Cup 2026 league/tournament ID on API-Football ──────────────────
// World Cup 2026 league ID = 1 (confirmed on API-Football docs)
const WC_LEAGUE_ID = 1;
const WC_SEASON = 2026;

const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

// ── Low-level HTTP helpers ────────────────────────────────────────────────────

async function apiFetch<T>(url: string, apiKey: string, host: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
      },
      next: { revalidate: 300 }, // 5-min cache
    });
    if (!res.ok) {
      console.error(`[sports-api] ${url} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[sports-api] fetch error: ${String(err)}`);
    return null;
  }
}

async function footballDataFetch<T>(url: string, apiKey: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[sports-api fallback] ${url} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[sports-api fallback] fetch error: ${String(err)}`);
    return null;
  }
}

// ── API-Football response shapes (minimal, only what we use) ──────────────────

interface AFTeamResponse {
  response?: Array<{
    team: { id: number; name: string; code: string | null; country: string; logo: string };
  }>;
}

interface AFPlayerResponse {
  response?: Array<{
    player: {
      id: number;
      name: string;
      nationality: string | null;
      age: number | null;
      height: string | null;
      photo: string | null;
    };
    statistics: Array<{
      team: { id: number };
      games: {
        position: string | null;
        number: number | null;
        minutes: number | null;
        rating: string | null;
      };
      goals: { total: number | null; assists: number | null };
      cards: { yellow: number | null; red: number | null };
      shots: { total: number | null };
    }>;
  }>;
  paging?: { current: number; total: number };
}

interface AFFixtureResponse {
  response?: Array<{
    fixture: {
      id: number;
      date: string;
      status: { short: string };
      venue: { name: string | null; city: string | null };
    };
    league: { round: string };
    teams: { home: { id: number }; away: { id: number } };
    goals: { home: number | null; away: number | null };
    score: { halftime: { home: number | null; away: number | null } };
  }>;
}

// ── Map API-Football status to canonical ─────────────────────────────────────

function mapStatus(short: string): ApiFixture['status'] {
  if (['FT', 'AET', 'PEN', 'WO', 'AWD'].includes(short)) return 'finished';
  if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(short)) return 'live';
  if (['PST', 'CANC', 'ABD', 'INT', 'TBD'].includes(short)) return 'postponed';
  return 'scheduled';
}

// ── Map continent from API-Football country to canonical ────────────────────

const COUNTRY_CONTINENT: Record<string, string> = {
  Argentina: 'CONMEBOL',
  Brazil: 'CONMEBOL',
  Uruguay: 'CONMEBOL',
  Colombia: 'CONMEBOL',
  Ecuador: 'CONMEBOL',
  Venezuela: 'CONMEBOL',
  Chile: 'CONMEBOL',
  Paraguay: 'CONMEBOL',
  Spain: 'UEFA',
  France: 'UEFA',
  Portugal: 'UEFA',
  Germany: 'UEFA',
  England: 'UEFA',
  Italy: 'UEFA',
  Netherlands: 'UEFA',
  Belgium: 'UEFA',
  Croatia: 'UEFA',
  Switzerland: 'UEFA',
  Mexico: 'CONCACAF',
  'United States': 'CONCACAF',
  USA: 'CONCACAF',
  Canada: 'CONCACAF',
  Morocco: 'CAF',
  Nigeria: 'CAF',
  Senegal: 'CAF',
  Ghana: 'CAF',
  Egypt: 'CAF',
  Japan: 'AFC',
  'South Korea': 'AFC',
  Australia: 'AFC',
  'Saudi Arabia': 'AFC',
  Iran: 'AFC',
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch all teams participating in the World Cup 2026.
 * Returns null if the API key is missing or the request fails.
 */
export async function fetchTeams(): Promise<ApiTeam[] | null> {
  const apiKey = process.env.SPORTS_API_KEY;
  if (!apiKey) {
    console.warn('[sports-api] SPORTS_API_KEY not set — fetchTeams returning null');
    return null;
  }

  const url = `${API_FOOTBALL_BASE}/teams?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`;
  const data = await apiFetch<AFTeamResponse>(url, apiKey, 'v3.football.api-sports.io');
  if (!data?.response) return null;

  return data.response.map(({ team }) => ({
    apiId: team.id,
    name: team.name,
    shortName: team.code ?? null,
    iso: null, // API-Football doesn't expose ISO codes — resolved from COUNTRY_ALIASES in seed
    continent: COUNTRY_CONTINENT[team.country] ?? null,
    logoUrl: team.logo ?? null,
  }));
}

/**
 * Fetch players for a given API-Football team ID.
 * Paginates automatically (API-Football returns max 20 per page).
 */
export async function fetchPlayers(teamApiId: number): Promise<ApiPlayer[] | null> {
  const apiKey = process.env.SPORTS_API_KEY;
  if (!apiKey) {
    console.warn('[sports-api] SPORTS_API_KEY not set — fetchPlayers returning null');
    return null;
  }

  const players: ApiPlayer[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `${API_FOOTBALL_BASE}/players?team=${teamApiId}&season=${WC_SEASON}&page=${page}`;
    const data = await apiFetch<AFPlayerResponse>(url, apiKey, 'v3.football.api-sports.io');
    if (!data?.response) break;

    totalPages = data.paging?.total ?? 1;

    for (const entry of data.response) {
      const stats = entry.statistics[0];
      if (!stats) continue;
      players.push({
        apiId: entry.player.id,
        name: entry.player.name,
        position: stats.games.position ?? null,
        nationality: entry.player.nationality ?? null,
        age: entry.player.age ?? null,
        jerseyNumber: stats.games.number ?? null,
        photoUrl: entry.player.photo ?? null,
        teamApiId,
        goals: stats.goals.total ?? 0,
        assists: stats.goals.assists ?? 0,
        yellowCards: stats.cards.yellow ?? 0,
        redCards: stats.cards.red ?? 0,
        minutesPlayed: stats.games.minutes ?? 0,
        shotsTotal: stats.shots.total ?? 0,
        rating: stats.games.rating ? parseFloat(stats.games.rating) : null,
      });
    }

    page++;
  } while (page <= totalPages);

  return players;
}

/**
 * Fetch all fixtures (scheduled + past) for the World Cup 2026.
 */
export async function fetchFixtures(): Promise<ApiFixture[] | null> {
  const apiKey = process.env.SPORTS_API_KEY;
  if (!apiKey) {
    console.warn('[sports-api] SPORTS_API_KEY not set — fetchFixtures returning null');
    return null;
  }

  const url = `${API_FOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}`;
  const data = await apiFetch<AFFixtureResponse>(url, apiKey, 'v3.football.api-sports.io');
  if (!data?.response) return null;

  return data.response.map((entry) => ({
    apiId: entry.fixture.id,
    homeTeamApiId: entry.teams.home.id,
    awayTeamApiId: entry.teams.away.id,
    stage: entry.league.round,
    matchDate: entry.fixture.date,
    venue: entry.fixture.venue.name ?? null,
    city: entry.fixture.venue.city ?? null,
    status: mapStatus(entry.fixture.status.short),
  }));
}

/**
 * Fetch finished results for World Cup 2026.
 */
export async function fetchResults(): Promise<ApiResult[] | null> {
  const apiKey = process.env.SPORTS_API_KEY;
  if (!apiKey) {
    console.warn('[sports-api] SPORTS_API_KEY not set — fetchResults returning null');
    return null;
  }

  const url = `${API_FOOTBALL_BASE}/fixtures?league=${WC_LEAGUE_ID}&season=${WC_SEASON}&status=FT-AET-PEN`;
  const data = await apiFetch<AFFixtureResponse>(url, apiKey, 'v3.football.api-sports.io');
  if (!data?.response) return null;

  return data.response
    .filter((e) => e.goals.home !== null && e.goals.away !== null)
    .map((entry) => {
      const homeGoals = entry.goals.home ?? 0;
      const awayGoals = entry.goals.away ?? 0;
      const winner: 'home' | 'away' | 'draw' =
        homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';
      return {
        fixtureApiId: entry.fixture.id,
        homeGoals,
        awayGoals,
        winner,
        homeGoalsHt: entry.score.halftime.home,
        awayGoalsHt: entry.score.halftime.away,
      };
    });
}

// ── football-data.org fallback (fixtures only) ────────────────────────────────

interface FDFixtureResponse {
  matches?: Array<{
    id: number;
    utcDate: string;
    status: string;
    stage: string;
    homeTeam: { id: number };
    awayTeam: { id: number };
    venue: string | null;
    score: {
      fullTime: { home: number | null; away: number | null };
      halfTime: { home: number | null; away: number | null };
    };
  }>;
}

/**
 * Fallback: fetch fixtures via football-data.org (free, no player stats).
 * Used when SPORTS_API_KEY is absent but FOOTBALL_DATA_API_KEY is set.
 */
export async function fetchFixturesFallback(): Promise<ApiFixture[] | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return null;

  // football-data.org World Cup 2026 competition code
  const url = `${FOOTBALL_DATA_BASE}/competitions/WC/matches?season=2026`;
  const data = await footballDataFetch<FDFixtureResponse>(url, apiKey);
  if (!data?.matches) return null;

  return data.matches.map((m) => ({
    apiId: m.id,
    homeTeamApiId: m.homeTeam.id,
    awayTeamApiId: m.awayTeam.id,
    stage: m.stage,
    matchDate: m.utcDate,
    venue: m.venue ?? null,
    city: null,
    status: mapStatus(m.status),
  }));
}
