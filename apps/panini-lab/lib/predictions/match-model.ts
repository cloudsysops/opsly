/**
 * Match prediction model — Poisson-based 1X2 probabilities + likely scoreline.
 *
 * Algorithm:
 *  1. Compute attack/defense strength for each team from their stats (FIFA rank,
 *     recent form, WC experience). When real season goal stats are available they
 *     take precedence; otherwise we fall back to rank-derived estimates.
 *  2. Model home and away expected goals (λ_home, λ_away) via Poisson.
 *  3. Compute P(win), P(draw), P(away win) by summing P(home goals = i) * P(away goals = j)
 *     over a grid (0..MAX_GOALS × 0..MAX_GOALS).
 *  4. Optionally apply a small collection bonus (fan engagement signal) — cosmetic only,
 *     capped at ±5% probability shift.
 *
 * References:
 *  - Dixon & Coles (1997) — bivariate Poisson with low-score correction
 *  - Maher (1982) — independent Poisson goals model
 */

export interface TeamStrength {
  name: string;
  fifaRank: number;          // 1 = best
  recentForm: number;        // 0–100
  wcWins: number;
  // Optional live stats — used when available
  avgGoalsScored?: number;   // per match this season
  avgGoalsConceded?: number; // per match this season
  collectionCount?: number;  // sticker count (fan engagement signal)
}

export interface MatchPrediction {
  probHomeWin: number;       // 0–100, rounded to 1dp
  probDraw: number;
  probAwayWin: number;
  predictedHome: number;     // most likely home goals
  predictedAway: number;     // most likely away goals
  expectedGoalsHome: number; // λ_home
  expectedGoalsAway: number; // λ_away
  label: string;             // human-readable summary
  collectionBonusApplied: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MAX_GOALS = 8;          // grid upper bound (P(x>8) ≈ 0 for typical λ)
const LEAGUE_AVG_GOALS = 1.35; // World Cup average goals/team/game (historical ~2.6 total)

// Dixon-Coles low-score correction factor (ρ = -0.13, standard value)
const DC_RHO = -0.13;

// ── Poisson probability P(X = k | λ) ─────────────────────────────────────────

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0 || k < 0) return 0;
  // Use log-space to avoid overflow for large k
  let logP = -lambda;
  for (let i = 1; i <= k; i++) {
    logP += Math.log(lambda) - Math.log(i);
  }
  return Math.exp(logP);
}

// ── Dixon-Coles τ correction for {0,0} {1,0} {0,1} {1,1} ────────────────────

function dcCorrection(homeGoals: number, awayGoals: number, lh: number, la: number): number {
  if (homeGoals === 0 && awayGoals === 0) return 1 - lh * la * DC_RHO;
  if (homeGoals === 1 && awayGoals === 0) return 1 + la * DC_RHO;
  if (homeGoals === 0 && awayGoals === 1) return 1 + lh * DC_RHO;
  if (homeGoals === 1 && awayGoals === 1) return 1 - DC_RHO;
  return 1;
}

// ── Derive attack/defense rating from team metadata ────────────────────────────

/**
 * Returns estimated [attackStrength, defenseStrength] as Maher-model multipliers:
 *   - attack: how many goals the team scores relative to league avg (higher = better)
 *   - defense: how many goals the team CONCEDES relative to league avg (LOWER = better)
 *
 * Usage in Poisson model:
 *   λ_home = attack_home * defense_away * LEAGUE_AVG_GOALS * homeAdvantage
 *   λ_away = attack_away * defense_home * LEAGUE_AVG_GOALS
 *
 * When live goal stats are available, they are used directly; otherwise we
 * derive from FIFA rank and form.
 */
function teamStrengths(team: TeamStrength): [attack: number, defense: number] {
  if (team.avgGoalsScored !== undefined && team.avgGoalsConceded !== undefined) {
    // Real stats: normalize against league average
    // attack > 1 → scores above average; defense < 1 → concedes below average (strong)
    const attack = Math.max(0.3, team.avgGoalsScored / LEAGUE_AVG_GOALS);
    const defense = Math.max(0.2, team.avgGoalsConceded / LEAGUE_AVG_GOALS);
    return [attack, defense];
  }

  // Rank-derived fallback:
  //   rank 1  → attack = 1.5, defense = 0.55 (very strong)
  //   rank 60 → attack = 0.6, defense = 1.55 (weak)
  const maxRank = 60;
  const normalized = Math.min((team.fifaRank - 1) / (maxRank - 1), 1); // 0 = best, 1 = worst

  const attackBase = 1.5 - normalized * 0.9;   // 1.5 → 0.6
  const defenseBase = 0.55 + normalized * 1.0;  // 0.55 → 1.55

  // Form adjusts attack (high form → more goals)
  const formAdj = (team.recentForm - 70) / 100; // centred at 70; range ~ -0.7 to +0.3
  const attack = Math.max(0.3, attackBase + formAdj * 0.25);

  // Better form also tightens defense slightly
  const defense = Math.max(0.2, defenseBase - formAdj * 0.1);

  // WC experience reduces goals conceded (experienced teams are more disciplined)
  const expDefBonus = Math.min(0.1, team.wcWins * 0.03);

  return [attack, Math.max(0.2, defense - expDefBonus)];
}

// ── Collection bonus ──────────────────────────────────────────────────────────

/**
 * Applies a small fan-engagement-driven probability nudge when the user has
 * sticker collection data for one of the teams.
 * Max shift: ±5% probability points.
 */
function applyCollectionBonus(
  pred: Omit<MatchPrediction, 'label' | 'collectionBonusApplied'>,
  home: TeamStrength,
  away: TeamStrength
): { probHomeWin: number; probDraw: number; probAwayWin: number } {
  const homeCount = home.collectionCount ?? 0;
  const awayCount = away.collectionCount ?? 0;
  if (homeCount === 0 && awayCount === 0) {
    return { probHomeWin: pred.probHomeWin, probDraw: pred.probDraw, probAwayWin: pred.probAwayWin };
  }

  const total = homeCount + awayCount;
  // homeBias: +1 = all stickers are home, -1 = all away
  const homeBias = total > 0 ? (homeCount - awayCount) / total : 0;
  const shift = homeBias * 5; // max 5pp shift

  const newHome = Math.max(0, Math.min(95, pred.probHomeWin + shift));
  const newAway = Math.max(0, Math.min(95, pred.probAwayWin - shift));
  const newDraw = Math.max(0, 100 - newHome - newAway);
  return { probHomeWin: newHome, probDraw: newDraw, probAwayWin: newAway };
}

// ── Main prediction function ──────────────────────────────────────────────────

/**
 * Predict the result of a match between home and away teams.
 *
 * @param home - Home team strength data
 * @param away - Away team strength data
 * @param options.homeAdvantage - home advantage multiplier (default 1.1 for WC neutral venues)
 * @param options.applyCollectionBonus - apply fan sticker collection nudge (default false)
 */
export function predictMatch(
  home: TeamStrength,
  away: TeamStrength,
  options: { homeAdvantage?: number; applyCollectionBonus?: boolean } = {}
): MatchPrediction {
  const homeAdv = options.homeAdvantage ?? 1.05; // slight advantage at World Cup

  const [homeAtk, homeDef] = teamStrengths(home);
  const [awayAtk, awayDef] = teamStrengths(away);

  // Expected goals: λ = attack_home * defense_away * league_avg * homeAdv
  const lambdaHome = Math.max(0.1, homeAtk * awayDef * LEAGUE_AVG_GOALS * homeAdv);
  const lambdaAway = Math.max(0.1, awayAtk * homeDef * LEAGUE_AVG_GOALS);

  // Build probability matrix
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  let maxProb = 0;
  let predictedHome = 0;
  let predictedAway = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const ph = poissonPmf(lambdaHome, h);
      const pa = poissonPmf(lambdaAway, a);
      const tau = dcCorrection(h, a, lambdaHome, lambdaAway);
      const p = ph * pa * tau;

      if (h > a) pHome += p;
      else if (h === a) pDraw += p;
      else pAway += p;

      if (p > maxProb) {
        maxProb = p;
        predictedHome = h;
        predictedAway = a;
      }
    }
  }

  // Normalize (grid doesn't sum to exactly 1 due to DC correction)
  const totalP = pHome + pDraw + pAway;
  const normalize = totalP > 0 ? 100 / totalP : 100;

  const rawPred = {
    probHomeWin: Math.round((pHome * normalize) * 10) / 10,
    probDraw: Math.round((pDraw * normalize) * 10) / 10,
    probAwayWin: Math.round((pAway * normalize) * 10) / 10,
    predictedHome,
    predictedAway,
    expectedGoalsHome: Math.round(lambdaHome * 100) / 100,
    expectedGoalsAway: Math.round(lambdaAway * 100) / 100,
  };

  // Apply collection bonus if requested
  const { probHomeWin, probDraw, probAwayWin } =
    options.applyCollectionBonus
      ? applyCollectionBonus(rawPred, home, away)
      : rawPred;

  const label = buildLabel(probHomeWin, probDraw, probAwayWin, home.name, away.name);

  return {
    probHomeWin: Math.round(probHomeWin * 10) / 10,
    probDraw: Math.round(probDraw * 10) / 10,
    probAwayWin: Math.round(probAwayWin * 10) / 10,
    predictedHome,
    predictedAway,
    expectedGoalsHome: rawPred.expectedGoalsHome,
    expectedGoalsAway: rawPred.expectedGoalsAway,
    label,
    collectionBonusApplied: Boolean(options.applyCollectionBonus),
  };
}

function buildLabel(
  probHome: number,
  probDraw: number,
  probAway: number,
  homeName: string,
  awayName: string
): string {
  const max = Math.max(probHome, probDraw, probAway);
  if (max === probHome) {
    const margin = probHome - probAway;
    if (margin > 25) return `${homeName} claro favorito`;
    if (margin > 12) return `${homeName} ligera ventaja`;
    return 'Partido muy parejo';
  }
  if (max === probAway) {
    const margin = probAway - probHome;
    if (margin > 25) return `${awayName} claro favorito`;
    if (margin > 12) return `${awayName} ligera ventaja`;
    return 'Partido muy parejo';
  }
  return 'Empate es el resultado más probable';
}

/**
 * Compute tournament win probability using only real football data:
 *   - FIFA ranking (40%)
 *   - Recent form / qualifying performance (35%)
 *   - World Cup historical experience (25%)
 *
 * Collection of figuritas is intentionally excluded — predictions must be
 * based on real market data, not fan engagement.
 */
export function tournamentWinProbabilities(
  teams: Array<{ name: string; fifaRank: number; recentForm: number; wcWins: number }>
): Array<{ name: string; winProbability: number; powerScore: number }> {
  const scores = teams.map((t) => {
    const rankScore = Math.max(40, 100 - (t.fifaRank - 1) * 1.0);
    const formScore = t.recentForm;
    const expScore = Math.min(25, t.wcWins * 10);
    const powerScore = Math.round(rankScore * 0.4 + formScore * 0.35 + expScore * 0.25);
    return { name: t.name, powerScore, winProbability: 0 };
  });

  const total = scores.reduce((s, t) => s + t.powerScore, 0);
  return scores
    .map((s) => ({
      ...s,
      winProbability: Math.round((s.powerScore / total) * 100 * 10) / 10,
    }))
    .sort((a, b) => b.powerScore - a.powerScore);
}
