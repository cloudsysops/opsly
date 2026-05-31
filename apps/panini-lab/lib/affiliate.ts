/**
 * Affiliate link utilities + geo-detection for Polymarket deep-links.
 *
 * IMPORTANT LEGAL NOTES:
 *  - Polymarket is restricted for US residents (CFTC agreement).
 *  - This module gates CTA display based on IP country.
 *  - Users in restricted jurisdictions see "unavailable in your region" instead of CTAs.
 *  - Users are 18+ gated before any betting-related content.
 *
 * We are an information/analytics provider, NOT a betting service or bookie.
 * We do not accept wagers, custody funds, or guarantee outcomes.
 */

import { NextRequest } from 'next/server';

// ── Restricted jurisdictions for Polymarket ────────────────────────────────
// Polymarket blocked US users per CFTC settlement. This list may expand.
export const RESTRICTED_COUNTRIES = new Set(['US']);

/**
 * Detect the user's ISO country code from request headers.
 * Uses Cloudflare's CF-IPCountry header (available behind Cloudflare proxy)
 * or X-Country-Code (set by some VPS proxies).
 * Falls back to null if not detectable.
 */
export function detectCountry(req: NextRequest): string | null {
  return (
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-country-code') ??
    null
  );
}

/**
 * Returns true if the country code is in the restricted list.
 * null country = not restricted (give benefit of the doubt; disclaimers still shown).
 */
export function isRestricted(countryCode: string | null): boolean {
  if (!countryCode) return false;
  return RESTRICTED_COUNTRIES.has(countryCode.toUpperCase());
}

/**
 * Build a deep-link to a specific Polymarket market with affiliate tracking.
 */
export function buildAffiliateLink(conditionId: string, refCode?: string): string {
  const ref = refCode ?? process.env.POLYMARKET_REF ?? 'paninilab';
  return `https://polymarket.com/event/${conditionId}?ref=${ref}`;
}

/**
 * Build a Polymarket search link for a topic (e.g. a team name).
 */
export function buildSearchLink(query: string): string {
  return `https://polymarket.com/search?q=${encodeURIComponent(query)}`;
}
