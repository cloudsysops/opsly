/**
 * Polymarket Gamma Markets API client (public — no key required).
 *
 * Docs: https://docs.polymarket.com/#gamma-markets-api
 *
 * Returns active World Cup 2026 markets and their current prices.
 * We use the YES-outcome price as the implied probability (0–1).
 */

export interface GammaMarket {
  conditionId: string;
  question: string;
  category: string | null;
  outcomePrices: string;   // JSON array: e.g. '["0.62","0.38"]'
  outcomes: string;        // JSON array: e.g. '["Yes","No"]'
  volume: string;          // total volume in USDC
  endDate: string | null;  // ISO string
  active: boolean;
  closed: boolean;
  tags: Array<{ label: string }>;
}

interface GammaApiResponse {
  data?: GammaMarket[];
  markets?: GammaMarket[];
}

const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const FOOTBALL_TAGS = ['soccer', 'football', 'world cup', 'fifa', 'mundial'];

/**
 * Fetch all active World Cup 2026 markets from Polymarket Gamma API.
 * Returns an empty array on any error (non-critical).
 */
export async function fetchWorldCupMarkets(): Promise<GammaMarket[]> {
  try {
    // Query active markets tagged with soccer/football
    const url = `${GAMMA_BASE}/markets?tag_slug=soccer&active=true&closed=false&limit=200`;
    const res = await fetch(url, {
      next: { revalidate: 900 }, // 15-min cache — Polymarket prices update frequently
    });

    if (!res.ok) {
      console.error(`[polymarket] Gamma API ${res.status}`);
      return [];
    }

    const json = (await res.json()) as GammaApiResponse | GammaMarket[];

    // Gamma API returns either an array directly or { data/markets: [...] }
    const markets: GammaMarket[] = Array.isArray(json)
      ? json
      : (json.data ?? json.markets ?? []);

    // Filter to World Cup related markets
    return markets.filter((m) => {
      const q = m.question.toLowerCase();
      const tags = m.tags?.map((t) => t.label.toLowerCase()) ?? [];
      return (
        FOOTBALL_TAGS.some((tag) => q.includes(tag) || tags.includes(tag)) &&
        m.active &&
        !m.closed
      );
    });
  } catch (err) {
    console.error('[polymarket] fetchWorldCupMarkets error:', String(err));
    return [];
  }
}

/**
 * Extract YES price (implied probability 0–1) from a Gamma market.
 * outcomePrices is a JSON array like ["0.62","0.38"] where index 0 = YES.
 */
export function extractYesPrice(market: GammaMarket): number | null {
  try {
    const prices = JSON.parse(market.outcomePrices) as string[];
    const yesPrice = parseFloat(prices[0] ?? '0');
    return isNaN(yesPrice) ? null : Math.min(0.99, Math.max(0.01, yesPrice));
  } catch {
    return null;
  }
}

/**
 * Extract YES/NO prices as a tuple.
 */
export function extractPrices(market: GammaMarket): { yes: number; no: number } | null {
  try {
    const prices = JSON.parse(market.outcomePrices) as string[];
    const yes = parseFloat(prices[0] ?? '0');
    const no = parseFloat(prices[1] ?? '0');
    if (isNaN(yes) || isNaN(no)) return null;
    return { yes: Math.min(0.99, Math.max(0.01, yes)), no: Math.min(0.99, Math.max(0.01, no)) };
  } catch {
    return null;
  }
}

/**
 * Parse volume string to number (USDC).
 */
export function parseVolume(volumeStr: string): number {
  const v = parseFloat(volumeStr);
  return isNaN(v) ? 0 : v;
}
