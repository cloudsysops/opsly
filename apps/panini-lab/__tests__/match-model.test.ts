import { describe, expect, it } from 'vitest';
import { predictMatch, tournamentWinProbabilities, type TeamStrength } from '../lib/predictions/match-model';

const ARGENTINA: TeamStrength = {
  name: 'Argentina',
  fifaRank: 1,
  recentForm: 88,
  wcWins: 3,
};

const SPAIN: TeamStrength = {
  name: 'España',
  fifaRank: 3,
  recentForm: 90,
  wcWins: 1,
};

const AUSTRALIA: TeamStrength = {
  name: 'Australia',
  fifaRank: 26,
  recentForm: 67,
  wcWins: 0,
};

describe('predictMatch — probabilities', () => {
  it('probabilities sum to ~100', () => {
    const result = predictMatch(ARGENTINA, AUSTRALIA);
    const total = result.probHomeWin + result.probDraw + result.probAwayWin;
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });

  it('strong team vs weak team: strong team has >50% win probability', () => {
    const result = predictMatch(ARGENTINA, AUSTRALIA);
    expect(result.probHomeWin).toBeGreaterThan(50);
  });

  it('evenly matched teams: no team has >70% probability', () => {
    const result = predictMatch(ARGENTINA, SPAIN);
    expect(result.probHomeWin).toBeLessThan(70);
    expect(result.probAwayWin).toBeLessThan(70);
  });

  it('all probabilities are non-negative', () => {
    const result = predictMatch(SPAIN, AUSTRALIA);
    expect(result.probHomeWin).toBeGreaterThanOrEqual(0);
    expect(result.probDraw).toBeGreaterThanOrEqual(0);
    expect(result.probAwayWin).toBeGreaterThanOrEqual(0);
  });

  it('predicted score is non-negative integers', () => {
    const result = predictMatch(ARGENTINA, AUSTRALIA);
    expect(result.predictedHome).toBeGreaterThanOrEqual(0);
    expect(result.predictedAway).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.predictedHome)).toBe(true);
    expect(Number.isInteger(result.predictedAway)).toBe(true);
  });

  it('expected goals are positive', () => {
    const result = predictMatch(ARGENTINA, AUSTRALIA);
    expect(result.expectedGoalsHome).toBeGreaterThan(0);
    expect(result.expectedGoalsAway).toBeGreaterThan(0);
  });
});

describe('predictMatch — collection bonus', () => {
  it('collection bonus does not break probability sum', () => {
    const homeWithStickers: TeamStrength = { ...ARGENTINA, collectionCount: 20 };
    const awayNoStickers: TeamStrength = { ...AUSTRALIA, collectionCount: 0 };
    const result = predictMatch(homeWithStickers, awayNoStickers, { applyCollectionBonus: true });
    const total = result.probHomeWin + result.probDraw + result.probAwayWin;
    expect(total).toBeGreaterThan(98);
    expect(total).toBeLessThan(102);
    expect(result.collectionBonusApplied).toBe(true);
  });

  it('collection bonus shifts probability toward team with more stickers', () => {
    const withStickers: TeamStrength = { ...ARGENTINA, collectionCount: 50 };
    const withoutStickers: TeamStrength = { ...AUSTRALIA, collectionCount: 0 };
    const baseResult = predictMatch(ARGENTINA, AUSTRALIA, { applyCollectionBonus: false });
    const bonusResult = predictMatch(withStickers, withoutStickers, { applyCollectionBonus: true });
    expect(bonusResult.probHomeWin).toBeGreaterThanOrEqual(baseResult.probHomeWin);
  });

  it('collection bonus is capped — does not give 100% to any team', () => {
    const extremeHome: TeamStrength = { ...ARGENTINA, collectionCount: 10000 };
    const extremeAway: TeamStrength = { ...AUSTRALIA, collectionCount: 0 };
    const result = predictMatch(extremeHome, extremeAway, { applyCollectionBonus: true });
    expect(result.probHomeWin).toBeLessThanOrEqual(95);
    expect(result.probAwayWin).toBeGreaterThanOrEqual(0);
  });
});

describe('predictMatch — with real stats', () => {
  it('uses avgGoalsScored/Conceded when provided', () => {
    const highScoring: TeamStrength = {
      ...ARGENTINA,
      avgGoalsScored: 2.5,
      avgGoalsConceded: 0.4,
    };
    const lowScoring: TeamStrength = {
      ...AUSTRALIA,
      avgGoalsScored: 0.8,
      avgGoalsConceded: 1.8,
    };
    const result = predictMatch(highScoring, lowScoring);
    expect(result.probHomeWin).toBeGreaterThan(60);
    expect(result.expectedGoalsHome).toBeGreaterThan(result.expectedGoalsAway);
  });
});

describe('tournamentWinProbabilities', () => {
  // Uses only real football data — collection counts intentionally excluded
  const teams = [ARGENTINA, SPAIN, AUSTRALIA].map(({ name, fifaRank, recentForm, wcWins }) => ({
    name,
    fifaRank,
    recentForm,
    wcWins,
  }));

  it('returns empty array for empty input', () => {
    const results = tournamentWinProbabilities([]);
    expect(results).toEqual([]);
  });

  it('all probabilities are positive', () => {
    const results = tournamentWinProbabilities(teams);
    for (const r of results) {
      expect(r.winProbability).toBeGreaterThan(0);
    }
  });

  it('probabilities sum to ~100', () => {
    const results = tournamentWinProbabilities(teams);
    const total = results.reduce((s, r) => s + r.winProbability, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });

  it('top ranked team has highest win probability', () => {
    const results = tournamentWinProbabilities(teams);
    const argentinaProb = results.find((r) => r.name === 'Argentina')?.winProbability ?? 0;
    const australiaProb = results.find((r) => r.name === 'Australia')?.winProbability ?? 0;
    expect(argentinaProb).toBeGreaterThan(australiaProb);
  });

  it('returns sorted by power score descending', () => {
    const results = tournamentWinProbabilities(teams);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.powerScore).toBeGreaterThanOrEqual(results[i]!.powerScore);
    }
  });
});
