/**
 * FIFA World Cup 2026 — team data + prediction engine.
 * Rankings approximate (FIFA Jan 2026). Groups based on Dec 2025 draw.
 */

export interface TeamData {
  name: string;
  iso: string;       // ISO alpha-2 for flag emoji
  fifaRank: number;  // Lower = better
  group: string;
  continent: 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
  worldCupWins: number;
  recentForm: number; // 0–100, recent qualifying performance
}

export const TEAMS: TeamData[] = [
  // CONMEBOL
  { name: 'Argentina', iso: 'AR', fifaRank: 1, group: 'C', continent: 'CONMEBOL', worldCupWins: 3, recentForm: 88 },
  { name: 'Brasil', iso: 'BR', fifaRank: 5, group: 'H', continent: 'CONMEBOL', worldCupWins: 5, recentForm: 82 },
  { name: 'Uruguay', iso: 'UY', fifaRank: 11, group: 'A', continent: 'CONMEBOL', worldCupWins: 2, recentForm: 76 },
  { name: 'Colombia', iso: 'CO', fifaRank: 9, group: 'G', continent: 'CONMEBOL', worldCupWins: 0, recentForm: 85 },
  { name: 'Ecuador', iso: 'EC', fifaRank: 35, group: 'C', continent: 'CONMEBOL', worldCupWins: 0, recentForm: 70 },
  { name: 'Venezuela', iso: 'VE', fifaRank: 47, group: 'B', continent: 'CONMEBOL', worldCupWins: 0, recentForm: 65 },
  // UEFA
  { name: 'España', iso: 'ES', fifaRank: 3, group: 'B', continent: 'UEFA', worldCupWins: 1, recentForm: 90 },
  { name: 'Francia', iso: 'FR', fifaRank: 2, group: 'E', continent: 'UEFA', worldCupWins: 2, recentForm: 87 },
  { name: 'Portugal', iso: 'PT', fifaRank: 6, group: 'F', continent: 'UEFA', worldCupWins: 0, recentForm: 84 },
  { name: 'Alemania', iso: 'DE', fifaRank: 12, group: 'A', continent: 'UEFA', worldCupWins: 4, recentForm: 78 },
  { name: 'Inglaterra', iso: 'GB', fifaRank: 4, group: 'D', continent: 'UEFA', worldCupWins: 1, recentForm: 86 },
  { name: 'Italia', iso: 'IT', fifaRank: 8, group: 'F', continent: 'UEFA', worldCupWins: 4, recentForm: 75 },
  { name: 'Holanda', iso: 'NL', fifaRank: 7, group: 'E', continent: 'UEFA', worldCupWins: 0, recentForm: 82 },
  // CONCACAF
  { name: 'México', iso: 'MX', fifaRank: 14, group: 'G', continent: 'CONCACAF', worldCupWins: 0, recentForm: 73 },
  { name: 'USA', iso: 'US', fifaRank: 13, group: 'D', continent: 'CONCACAF', worldCupWins: 0, recentForm: 76 },
  { name: 'Canadá', iso: 'CA', fifaRank: 39, group: 'H', continent: 'CONCACAF', worldCupWins: 0, recentForm: 69 },
  // CAF
  { name: 'Marruecos', iso: 'MA', fifaRank: 15, group: 'B', continent: 'CAF', worldCupWins: 0, recentForm: 80 },
  { name: 'Nigeria', iso: 'NG', fifaRank: 44, group: 'A', continent: 'CAF', worldCupWins: 0, recentForm: 65 },
  { name: 'Senegal', iso: 'SN', fifaRank: 18, group: 'G', continent: 'CAF', worldCupWins: 0, recentForm: 72 },
  // AFC
  { name: 'Japón', iso: 'JP', fifaRank: 17, group: 'D', continent: 'AFC', worldCupWins: 0, recentForm: 79 },
  { name: 'Corea', iso: 'KR', fifaRank: 23, group: 'E', continent: 'AFC', worldCupWins: 0, recentForm: 71 },
  { name: 'Arabia Saudita', iso: 'SA', fifaRank: 56, group: 'H', continent: 'AFC', worldCupWins: 0, recentForm: 63 },
  { name: 'Australia', iso: 'AU', fifaRank: 26, group: 'C', continent: 'AFC', worldCupWins: 0, recentForm: 67 },
];

export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export interface TeamScore {
  team: TeamData;
  powerScore: number;       // 0–100 combined score
  collectionBonus: number;  // sticker ownership bonus
  winProbability: number;   // % to win the tournament
}

/**
 * Calculate team power score using:
 * - FIFA rank (40%): normalized 1→100, 60→30
 * - Recent form (35%): direct 0–100
 * - World Cup experience (15%): wins * 5, capped at 25
 * - Collection bonus (10%): sticker count as fan engagement signal
 */
export function calculateTeamScores(
  stickersByCountry: Map<string, number>
): TeamScore[] {
  const maxStickers = Math.max(...stickersByCountry.values(), 1);

  const scores = TEAMS.map((team) => {
    // FIFA rank: rank 1 = 100pts, rank 60 = 40pts (linear)
    const rankScore = Math.max(40, 100 - (team.fifaRank - 1) * 1.0);

    // Form
    const formScore = team.recentForm;

    // World Cup wins (experience): 1 win = 10pts, max 25
    const expScore = Math.min(25, team.worldCupWins * 10);

    // Collection bonus: how many stickers user has for this team
    const owned = stickersByCountry.get(team.name) ?? 0;
    const collectionBonus = maxStickers > 0 ? Math.round((owned / maxStickers) * 20) : 0;

    const powerScore = Math.round(
      rankScore * 0.40 +
      formScore * 0.35 +
      expScore * 0.15 +
      collectionBonus * 0.5
    );

    return { team, powerScore, collectionBonus, winProbability: 0 };
  });

  // Normalize win probability (Elo-style softmax)
  const total = scores.reduce((s, t) => s + t.powerScore, 0);
  return scores
    .map((s) => ({
      ...s,
      winProbability: Math.round((s.powerScore / total) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.powerScore - a.powerScore);
}

export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)))
    .join('');
}

/** Head-to-head prediction between two teams */
export function headToHead(
  teamA: TeamScore,
  teamB: TeamScore
): { winner: string; prob: number; label: string } {
  const total = teamA.powerScore + teamB.powerScore;
  const probA = Math.round((teamA.powerScore / total) * 100);
  const winner = probA >= 50 ? teamA.team.name : teamB.team.name;
  const prob = probA >= 50 ? probA : 100 - probA;
  const label =
    prob >= 70 ? 'Favorito claro' : prob >= 58 ? 'Ligera ventaja' : 'Parejo';
  return { winner, prob, label };
}

export function getGroupTeams(group: string): TeamData[] {
  return TEAMS.filter((t) => t.group === group);
}
