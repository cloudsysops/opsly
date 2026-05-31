/**
 * Polymarket edge computation — compares our model probabilities vs market prices
 * to identify value opportunities.
 *
 * Edge = our_prob (%) - market_implied_prob (%)
 *   > +8%  → "strong_value": our model says significantly higher probability
 *   +4–8%  → "value": moderate edge
 *   -4–4%  → "fair": roughly in line with market
 *   < -4%  → "overpriced": market overvalues this outcome vs our model
 *
 * Important: This is for informational/entertainment purposes only.
 * We are a data intelligence layer, NOT a betting service.
 */

import type { GammaMarket } from './client';
import { extractYesPrice, parseVolume } from './client';
import type { DbTeam } from '@/lib/data/repos';

export interface ValueSignalInput {
  market: GammaMarket;
  ourProbPct: number; // our model probability 0–100
  teamName?: string;
}

export type SignalType = 'strong_value' | 'value' | 'fair' | 'overpriced';

export interface ComputedEdge {
  conditionId: string;
  question: string;
  ourProb: number; // 0–100
  marketImplied: number; // 0–100
  edge: number; // ourProb - marketImplied (pp)
  signal: SignalType;
  yesPrice: number; // raw price (0–1)
  volumeUsdc: number;
  polymarketUrl: string;
  closesAt: string | null;
}

const POLYMARKET_BASE = 'https://polymarket.com/event';

/**
 * Generate the Polymarket affiliate link for a market.
 * Uses the conditionId as the market identifier.
 *
 * Note: Polymarket does not have a public affiliate program yet.
 * The ref parameter is added speculatively — replace with actual affiliate code when available.
 */
export function buildPolymarketUrl(conditionId: string, refCode?: string): string {
  const ref = refCode ?? process.env.POLYMARKET_REF ?? 'paninilab';
  return `${POLYMARKET_BASE}/${conditionId}?ref=${ref}`;
}

/**
 * Classify the edge into a signal type.
 */
export function classifyEdge(edge: number): SignalType {
  if (edge > 8) return 'strong_value';
  if (edge > 4) return 'value';
  if (edge >= -4) return 'fair';
  return 'overpriced';
}

/**
 * Compute the edge for a single market given our model's probability.
 */
export function computeEdge(input: ValueSignalInput): ComputedEdge | null {
  const yesPrice = extractYesPrice(input.market);
  if (yesPrice === null) return null;

  const marketImplied = Math.round(yesPrice * 100 * 10) / 10;
  const edge = Math.round((input.ourProbPct - marketImplied) * 10) / 10;
  const signal = classifyEdge(edge);

  return {
    conditionId: input.market.conditionId,
    question: input.market.question,
    ourProb: Math.round(input.ourProbPct * 10) / 10,
    marketImplied,
    edge,
    signal,
    yesPrice,
    volumeUsdc: parseVolume(input.market.volume),
    polymarketUrl: buildPolymarketUrl(input.market.conditionId),
    closesAt: input.market.endDate ?? null,
  };
}

/**
 * Try to match a Polymarket market question to a team by name.
 * Returns the matching team or null.
 */
export function matchMarketToTeam(market: GammaMarket, teams: DbTeam[]): DbTeam | null {
  const q = market.question.toLowerCase();
  for (const team of teams) {
    const name = team.name.toLowerCase();
    const shortName = team.shortName?.toLowerCase();
    if (q.includes(name) || (shortName && q.includes(shortName))) {
      return team;
    }
  }
  return null;
}

/**
 * Filter and sort computed edges to return only actionable signals.
 * Minimum volume: 1000 USDC (to filter out illiquid markets).
 */
export function filterValueSignals(edges: ComputedEdge[], minVolume = 1000): ComputedEdge[] {
  return edges
    .filter((e) => e.volumeUsdc >= minVolume)
    .filter((e) => e.signal === 'strong_value' || e.signal === 'value')
    .sort((a, b) => b.edge - a.edge);
}
