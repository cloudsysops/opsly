/**
 * Seed data for wc_teams — migrated from lib/world-cup-data.ts TEAMS constant.
 * Used by the ingestion route when SPORTS_API_KEY is not available, and as the
 * initial data set before live API data is fetched.
 *
 * Group assignments and FIFA rankings as of January 2026 draw.
 */

export interface SeedTeam {
  name: string;
  iso: string;
  fifaRank: number;
  groupStage: string;
  continent: string;
  wcWins: number;
  recentForm: number;
}

export const SEED_TEAMS: SeedTeam[] = [
  // CONMEBOL
  {
    name: 'Argentina',
    iso: 'AR',
    fifaRank: 1,
    groupStage: 'C',
    continent: 'CONMEBOL',
    wcWins: 3,
    recentForm: 88,
  },
  {
    name: 'Brasil',
    iso: 'BR',
    fifaRank: 5,
    groupStage: 'H',
    continent: 'CONMEBOL',
    wcWins: 5,
    recentForm: 82,
  },
  {
    name: 'Uruguay',
    iso: 'UY',
    fifaRank: 11,
    groupStage: 'A',
    continent: 'CONMEBOL',
    wcWins: 2,
    recentForm: 76,
  },
  {
    name: 'Colombia',
    iso: 'CO',
    fifaRank: 9,
    groupStage: 'G',
    continent: 'CONMEBOL',
    wcWins: 0,
    recentForm: 85,
  },
  {
    name: 'Ecuador',
    iso: 'EC',
    fifaRank: 35,
    groupStage: 'C',
    continent: 'CONMEBOL',
    wcWins: 0,
    recentForm: 70,
  },
  {
    name: 'Venezuela',
    iso: 'VE',
    fifaRank: 47,
    groupStage: 'B',
    continent: 'CONMEBOL',
    wcWins: 0,
    recentForm: 65,
  },
  // UEFA
  {
    name: 'España',
    iso: 'ES',
    fifaRank: 3,
    groupStage: 'B',
    continent: 'UEFA',
    wcWins: 1,
    recentForm: 90,
  },
  {
    name: 'Francia',
    iso: 'FR',
    fifaRank: 2,
    groupStage: 'E',
    continent: 'UEFA',
    wcWins: 2,
    recentForm: 87,
  },
  {
    name: 'Portugal',
    iso: 'PT',
    fifaRank: 6,
    groupStage: 'F',
    continent: 'UEFA',
    wcWins: 0,
    recentForm: 84,
  },
  {
    name: 'Alemania',
    iso: 'DE',
    fifaRank: 12,
    groupStage: 'A',
    continent: 'UEFA',
    wcWins: 4,
    recentForm: 78,
  },
  {
    name: 'Inglaterra',
    iso: 'GB',
    fifaRank: 4,
    groupStage: 'D',
    continent: 'UEFA',
    wcWins: 1,
    recentForm: 86,
  },
  {
    name: 'Italia',
    iso: 'IT',
    fifaRank: 8,
    groupStage: 'F',
    continent: 'UEFA',
    wcWins: 4,
    recentForm: 75,
  },
  {
    name: 'Holanda',
    iso: 'NL',
    fifaRank: 7,
    groupStage: 'E',
    continent: 'UEFA',
    wcWins: 0,
    recentForm: 82,
  },
  // CONCACAF
  {
    name: 'México',
    iso: 'MX',
    fifaRank: 14,
    groupStage: 'G',
    continent: 'CONCACAF',
    wcWins: 0,
    recentForm: 73,
  },
  {
    name: 'USA',
    iso: 'US',
    fifaRank: 13,
    groupStage: 'D',
    continent: 'CONCACAF',
    wcWins: 0,
    recentForm: 76,
  },
  {
    name: 'Canadá',
    iso: 'CA',
    fifaRank: 39,
    groupStage: 'H',
    continent: 'CONCACAF',
    wcWins: 0,
    recentForm: 69,
  },
  // CAF
  {
    name: 'Marruecos',
    iso: 'MA',
    fifaRank: 15,
    groupStage: 'B',
    continent: 'CAF',
    wcWins: 0,
    recentForm: 80,
  },
  {
    name: 'Nigeria',
    iso: 'NG',
    fifaRank: 44,
    groupStage: 'A',
    continent: 'CAF',
    wcWins: 0,
    recentForm: 65,
  },
  {
    name: 'Senegal',
    iso: 'SN',
    fifaRank: 18,
    groupStage: 'G',
    continent: 'CAF',
    wcWins: 0,
    recentForm: 72,
  },
  // AFC
  {
    name: 'Japón',
    iso: 'JP',
    fifaRank: 17,
    groupStage: 'D',
    continent: 'AFC',
    wcWins: 0,
    recentForm: 79,
  },
  {
    name: 'Corea',
    iso: 'KR',
    fifaRank: 23,
    groupStage: 'E',
    continent: 'AFC',
    wcWins: 0,
    recentForm: 71,
  },
  {
    name: 'Arabia Saudita',
    iso: 'SA',
    fifaRank: 56,
    groupStage: 'H',
    continent: 'AFC',
    wcWins: 0,
    recentForm: 63,
  },
  {
    name: 'Australia',
    iso: 'AU',
    fifaRank: 26,
    groupStage: 'C',
    continent: 'AFC',
    wcWins: 0,
    recentForm: 67,
  },
];
