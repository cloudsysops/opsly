/**
 * Match prediction model — win/draw/loss and tournament probabilities.
 */

export interface TeamStrength {
  name: string;
  fifaRank: number;     // 1–210, lower = stronger
  recentForm: number;   // 0–100
  wcWins: number;       // world cup wins
}

export interface MatchPrediction {
  probHomeWin: number;   // 0–100
  probDraw: number;      // 0–100
  probAwayWin: number;   // 0–100
  predictedHome: number; // expected goals
  predictedAway: number;
}

export interface TournamentProbability {
  name: string;
  powerScore: number;     // composite 0–100
  winProbability: number; // 0–100
  top4Probability: number;
}

function teamPower(t: TeamStrength): number {
  const rankScore = Math.max(0, 100 - t.fifaRank * 0.5);
  const formScore = t.recentForm;
  const wcBonus = Math.min(20, t.wcWins * 4);
  return (rankScore * 0.5 + formScore * 0.4 + wcBonus * 0.1);
}

/** Predict match outcome given home/away team strengths. */
export function predictMatch(home: TeamStrength, away: TeamStrength): MatchPrediction {
  const homePow = teamPower(home) + 5; // home advantage
  const awayPow = teamPower(away);
  const total = homePow + awayPow || 1;

  const expectedHome = Math.max(0.4, (homePow / total) * 3.0);
  const expectedAway = Math.max(0.4, (awayPow / total) * 2.5);

  const homeWin = Math.min(90, Math.max(10, 50 + (homePow - awayPow) * 0.4));
  const draw = Math.min(35, Math.max(10, 28 - Math.abs(homePow - awayPow) * 0.3));
  const awayWin = Math.max(10, 100 - homeWin - draw);

  return {
    probHomeWin: Math.round(homeWin),
    probDraw: Math.round(draw),
    probAwayWin: Math.round(awayWin),
    predictedHome: Math.round(expectedHome * 10) / 10,
    predictedAway: Math.round(expectedAway * 10) / 10,
  };
}

/** Compute tournament win probabilities for a list of teams. */
export function tournamentWinProbabilities(
  teams: TeamStrength[]
): TournamentProbability[] {
  const powers = teams.map((t) => ({ t, pow: teamPower(t) }));
  const totalPow = powers.reduce((s, x) => s + x.pow, 0) || 1;

  return powers.map(({ t, pow }) => {
    const share = pow / totalPow;
    return {
      name: t.name,
      powerScore: Math.round(pow),
      winProbability: Math.min(100, Math.round(share * 100 * (teams.length / 2))),
      top4Probability: Math.min(100, Math.round(share * 100 * teams.length * 0.8)),
    };
  });
}
