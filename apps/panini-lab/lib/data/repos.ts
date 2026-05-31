/**
 * Data repositories for panini_lab prediction tables.
 *
 * Each function takes an optional SupabaseClient so callers can reuse
 * connections. Falls back to null return on any DB error (caller handles).
 *
 * Uses paniniDb() from lib/supabase.ts (schema = 'panini_lab').
 */

import { paniniDb, supabaseServer } from '@/lib/supabase';

// ── Canonical app types (mirror DB schema) ─────────────────────────────────────

export interface DbTeam {
  id: string;
  apiId: number | null;
  name: string;
  shortName: string | null;
  iso: string | null;
  groupStage: string | null;
  continent: string | null;
  fifaRank: number | null;
  recentForm: number | null;
  wcWins: number;
  logoUrl: string | null;
}

export interface DbPlayer {
  id: string;
  apiId: number | null;
  teamId: string;
  name: string;
  position: string | null;
  nationality: string | null;
  age: number | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  shotsTotal: number;
  rating: number | null;
}

export interface DbFixture {
  id: string;
  apiId: number | null;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam?: DbTeam;
  awayTeam?: DbTeam;
  stage: string;
  matchDate: string;
  venue: string | null;
  city: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  result?: DbResult | null;
  prediction?: DbMatchPrediction | null;
}

export interface DbResult {
  id: string;
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  winner: 'home' | 'away' | 'draw';
  homeGoalsHt: number | null;
  awayGoalsHt: number | null;
}

export interface DbMatchPrediction {
  id: string;
  fixtureId: string;
  probHomeWin: number;
  probDraw: number;
  probAwayWin: number;
  predictedHome: number | null;
  predictedAway: number | null;
  modelVersion: string;
  collectionBonusApplied: boolean;
  computedAt: string;
}

export interface DbPlayerPrediction {
  id: string;
  playerId: string;
  fixtureId: string;
  probGoal: number | null;
  probAssist: number | null;
  probYellow: number | null;
  probRed: number | null;
  modelVersion: string;
}

export interface DbPolymarketMarket {
  id: string;
  conditionId: string;
  question: string;
  category: string | null;
  fixtureId: string | null;
  teamId: string | null;
  playerId: string | null;
  outcomeYesPrice: number | null;
  outcomeNoPrice: number | null;
  volumeUsdc: number | null;
  closesAt: string | null;
  active: boolean;
  fetchedAt: string;
}

export interface DbValueSignal {
  id: string;
  marketId: string;
  market?: DbPolymarketMarket;
  ourProb: number;
  marketImplied: number;
  edge: number;
  signal: 'strong_value' | 'value' | 'fair' | 'overpriced';
  polymarketUrl: string | null;
  computedAt: string;
}

// ── Row mappers (snake_case DB → camelCase) ────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeam(row: Record<string, any>): DbTeam {
  return {
    id: row.id as string,
    apiId: (row.api_id as number | null) ?? null,
    name: row.name as string,
    shortName: (row.short_name as string | null) ?? null,
    iso: (row.iso as string | null) ?? null,
    groupStage: (row.group_stage as string | null) ?? null,
    continent: (row.continent as string | null) ?? null,
    fifaRank: (row.fifa_rank as number | null) ?? null,
    recentForm: row.recent_form !== null ? Number(row.recent_form) : null,
    wcWins: (row.wc_wins as number) ?? 0,
    logoUrl: (row.logo_url as string | null) ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlayer(row: Record<string, any>): DbPlayer {
  return {
    id: row.id as string,
    apiId: (row.api_id as number | null) ?? null,
    teamId: row.team_id as string,
    name: row.name as string,
    position: (row.position as string | null) ?? null,
    nationality: (row.nationality as string | null) ?? null,
    age: (row.age as number | null) ?? null,
    jerseyNumber: (row.jersey_number as number | null) ?? null,
    photoUrl: (row.photo_url as string | null) ?? null,
    goals: (row.goals as number) ?? 0,
    assists: (row.assists as number) ?? 0,
    yellowCards: (row.yellow_cards as number) ?? 0,
    redCards: (row.red_cards as number) ?? 0,
    minutesPlayed: (row.minutes_played as number) ?? 0,
    shotsTotal: (row.shots_total as number) ?? 0,
    rating: row.rating !== null ? Number(row.rating) : null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFixture(row: Record<string, any>): DbFixture {
  return {
    id: row.id as string,
    apiId: (row.api_id as number | null) ?? null,
    homeTeamId: row.home_team_id as string,
    awayTeamId: row.away_team_id as string,
    stage: row.stage as string,
    matchDate: row.match_date as string,
    venue: (row.venue as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    status: row.status as DbFixture['status'],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapResult(row: Record<string, any>): DbResult {
  return {
    id: row.id as string,
    fixtureId: row.fixture_id as string,
    homeGoals: row.home_goals as number,
    awayGoals: row.away_goals as number,
    winner: row.winner as 'home' | 'away' | 'draw',
    homeGoalsHt: (row.home_goals_ht as number | null) ?? null,
    awayGoalsHt: (row.away_goals_ht as number | null) ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMatchPrediction(row: Record<string, any>): DbMatchPrediction {
  return {
    id: row.id as string,
    fixtureId: row.fixture_id as string,
    probHomeWin: Number(row.prob_home_win),
    probDraw: Number(row.prob_draw),
    probAwayWin: Number(row.prob_away_win),
    predictedHome: (row.predicted_home as number | null) ?? null,
    predictedAway: (row.predicted_away as number | null) ?? null,
    modelVersion: row.model_version as string,
    collectionBonusApplied: Boolean(row.collection_bonus_applied),
    computedAt: row.computed_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapValueSignal(row: Record<string, any>): DbValueSignal {
  return {
    id: row.id as string,
    marketId: row.market_id as string,
    ourProb: Number(row.our_prob),
    marketImplied: Number(row.market_implied),
    edge: Number(row.edge),
    signal: row.signal as DbValueSignal['signal'],
    polymarketUrl: (row.polymarket_url as string | null) ?? null,
    computedAt: row.computed_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMarket(row: Record<string, any>): DbPolymarketMarket {
  return {
    id: row.id as string,
    conditionId: row.condition_id as string,
    question: row.question as string,
    category: (row.category as string | null) ?? null,
    fixtureId: (row.fixture_id as string | null) ?? null,
    teamId: (row.team_id as string | null) ?? null,
    playerId: (row.player_id as string | null) ?? null,
    outcomeYesPrice: row.outcome_yes_price !== null ? Number(row.outcome_yes_price) : null,
    outcomeNoPrice: row.outcome_no_price !== null ? Number(row.outcome_no_price) : null,
    volumeUsdc: row.volume_usdc !== null ? Number(row.volume_usdc) : null,
    closesAt: (row.closes_at as string | null) ?? null,
    active: Boolean(row.active),
    fetchedAt: row.fetched_at as string,
  };
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<DbTeam[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('wc_teams')
    .select('*')
    .order('fifa_rank', { ascending: true });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapTeam);
}

export async function getTeamByName(name: string): Promise<DbTeam | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_teams')
    .select('*')
    .eq('name', name)
    .single();

  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapTeam(data as Record<string, any>);
}

export async function upsertTeam(team: {
  apiId?: number | null;
  name: string;
  shortName?: string | null;
  iso?: string | null;
  groupStage?: string | null;
  continent?: string | null;
  fifaRank?: number | null;
  recentForm?: number | null;
  wcWins?: number;
  logoUrl?: string | null;
}): Promise<DbTeam | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_teams')
    .upsert(
      {
        api_id: team.apiId ?? null,
        name: team.name,
        short_name: team.shortName ?? null,
        iso: team.iso ?? null,
        group_stage: team.groupStage ?? null,
        continent: team.continent ?? null,
        fifa_rank: team.fifaRank ?? null,
        recent_form: team.recentForm ?? null,
        wc_wins: team.wcWins ?? 0,
        logo_url: team.logoUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertTeam error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapTeam(data as Record<string, any>);
}

// ── Players ───────────────────────────────────────────────────────────────────

export async function getPlayersByTeam(teamId: string): Promise<DbPlayer[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('wc_players')
    .select('*')
    .eq('team_id', teamId)
    .order('goals', { ascending: false });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapPlayer);
}

export async function getTopScorers(limit = 20): Promise<DbPlayer[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('wc_players')
    .select('*')
    .order('goals', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapPlayer);
}

export async function upsertPlayer(player: {
  apiId?: number | null;
  teamId: string;
  name: string;
  position?: string | null;
  nationality?: string | null;
  age?: number | null;
  jerseyNumber?: number | null;
  photoUrl?: string | null;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  minutesPlayed?: number;
  shotsTotal?: number;
  rating?: number | null;
}): Promise<DbPlayer | null> {
  const client = supabaseServer();
  if (!client) return null;

  const onConflict = player.apiId != null ? 'api_id' : 'name';
  const { data, error } = await paniniDb(client)
    .from('wc_players')
    .upsert(
      {
        api_id: player.apiId ?? null,
        team_id: player.teamId,
        name: player.name,
        position: player.position ?? null,
        nationality: player.nationality ?? null,
        age: player.age ?? null,
        jersey_number: player.jerseyNumber ?? null,
        photo_url: player.photoUrl ?? null,
        goals: player.goals ?? 0,
        assists: player.assists ?? 0,
        yellow_cards: player.yellowCards ?? 0,
        red_cards: player.redCards ?? 0,
        minutes_played: player.minutesPlayed ?? 0,
        shots_total: player.shotsTotal ?? 0,
        rating: player.rating ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertPlayer error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapPlayer(data as Record<string, any>);
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

export async function getUpcomingFixtures(limit = 20): Promise<DbFixture[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('wc_fixtures')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .order('match_date', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapFixture);
}

export async function getAllFixtures(): Promise<DbFixture[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('wc_fixtures')
    .select('*')
    .order('match_date', { ascending: true });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapFixture);
}

export async function upsertFixture(fixture: {
  apiId?: number | null;
  homeTeamId: string;
  awayTeamId: string;
  stage: string;
  matchDate: string;
  venue?: string | null;
  city?: string | null;
  status?: DbFixture['status'];
}): Promise<DbFixture | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_fixtures')
    .upsert(
      {
        api_id: fixture.apiId ?? null,
        home_team_id: fixture.homeTeamId,
        away_team_id: fixture.awayTeamId,
        stage: fixture.stage,
        match_date: fixture.matchDate,
        venue: fixture.venue ?? null,
        city: fixture.city ?? null,
        status: fixture.status ?? 'scheduled',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'api_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertFixture error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapFixture(data as Record<string, any>);
}

// ── Results ───────────────────────────────────────────────────────────────────

export async function upsertResult(result: {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  winner: 'home' | 'away' | 'draw';
  homeGoalsHt?: number | null;
  awayGoalsHt?: number | null;
}): Promise<DbResult | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_results')
    .upsert(
      {
        fixture_id: result.fixtureId,
        home_goals: result.homeGoals,
        away_goals: result.awayGoals,
        winner: result.winner,
        home_goals_ht: result.homeGoalsHt ?? null,
        away_goals_ht: result.awayGoalsHt ?? null,
      },
      { onConflict: 'fixture_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertResult error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapResult(data as Record<string, any>);
}

// ── Match predictions ─────────────────────────────────────────────────────────

export async function upsertMatchPrediction(pred: {
  fixtureId: string;
  probHomeWin: number;
  probDraw: number;
  probAwayWin: number;
  predictedHome?: number | null;
  predictedAway?: number | null;
  modelVersion?: string;
  collectionBonusApplied?: boolean;
}): Promise<DbMatchPrediction | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_match_predictions')
    .upsert(
      {
        fixture_id: pred.fixtureId,
        prob_home_win: pred.probHomeWin,
        prob_draw: pred.probDraw,
        prob_away_win: pred.probAwayWin,
        predicted_home: pred.predictedHome ?? null,
        predicted_away: pred.predictedAway ?? null,
        model_version: pred.modelVersion ?? 'v1-poisson',
        collection_bonus_applied: pred.collectionBonusApplied ?? false,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'fixture_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertMatchPrediction error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapMatchPrediction(data as Record<string, any>);
}

export async function getMatchPrediction(fixtureId: string): Promise<DbMatchPrediction | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('wc_match_predictions')
    .select('*')
    .eq('fixture_id', fixtureId)
    .single();

  if (error || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapMatchPrediction(data as Record<string, any>);
}

// ── Value signals ─────────────────────────────────────────────────────────────

export async function getTopValueSignals(limit = 20): Promise<DbValueSignal[]> {
  const client = supabaseServer();
  if (!client) return [];

  const { data, error } = await paniniDb(client)
    .from('value_signals')
    .select('*')
    .order('edge', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapValueSignal);
}

export async function upsertValueSignal(signal: {
  marketId: string;
  ourProb: number;
  marketImplied: number;
  edge: number;
  signal: DbValueSignal['signal'];
  polymarketUrl?: string | null;
}): Promise<DbValueSignal | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('value_signals')
    .upsert(
      {
        market_id: signal.marketId,
        our_prob: signal.ourProb,
        market_implied: signal.marketImplied,
        edge: signal.edge,
        signal: signal.signal,
        polymarket_url: signal.polymarketUrl ?? null,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'market_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertValueSignal error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapValueSignal(data as Record<string, any>);
}

// ── Polymarket markets ────────────────────────────────────────────────────────

export async function upsertPolymarketMarket(market: {
  conditionId: string;
  question: string;
  category?: string | null;
  fixtureId?: string | null;
  teamId?: string | null;
  playerId?: string | null;
  outcomeYesPrice?: number | null;
  outcomeNoPrice?: number | null;
  volumeUsdc?: number | null;
  closesAt?: string | null;
  active?: boolean;
}): Promise<DbPolymarketMarket | null> {
  const client = supabaseServer();
  if (!client) return null;

  const { data, error } = await paniniDb(client)
    .from('polymarket_markets')
    .upsert(
      {
        condition_id: market.conditionId,
        question: market.question,
        category: market.category ?? null,
        fixture_id: market.fixtureId ?? null,
        team_id: market.teamId ?? null,
        player_id: market.playerId ?? null,
        outcome_yes_price: market.outcomeYesPrice ?? null,
        outcome_no_price: market.outcomeNoPrice ?? null,
        volume_usdc: market.volumeUsdc ?? null,
        closes_at: market.closesAt ?? null,
        active: market.active ?? true,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'condition_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    console.error('[repos] upsertPolymarketMarket error:', error?.message);
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapMarket(data as Record<string, any>);
}

export async function getActiveMarkets(category?: string): Promise<DbPolymarketMarket[]> {
  const client = supabaseServer();
  if (!client) return [];

  let query = paniniDb(client)
    .from('polymarket_markets')
    .select('*')
    .eq('active', true)
    .order('fetched_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as Record<string, any>[]).map(mapMarket);
}

// ── Affiliate clicks ──────────────────────────────────────────────────────────

export async function insertAffiliateClick(click: {
  sessionId?: string | null;
  marketId?: string | null;
  signalId?: string | null;
  refCode?: string | null;
  destinationUrl: string;
  ipCountry?: string | null;
  userAgent?: string | null;
}): Promise<boolean> {
  const client = supabaseServer();
  if (!client) return false;

  const { error } = await paniniDb(client).from('affiliate_clicks').insert({
    session_id: click.sessionId ?? null,
    market_id: click.marketId ?? null,
    signal_id: click.signalId ?? null,
    ref_code: click.refCode ?? null,
    destination_url: click.destinationUrl,
    ip_country: click.ipCountry ?? null,
    user_agent: click.userAgent ?? null,
    clicked_at: new Date().toISOString(),
  });

  return !error;
}
