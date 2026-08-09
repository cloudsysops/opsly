/**
 * Optional staff gate for ICSO Mission Control.
 * If ICSO_MC_ACCESS_TOKEN is unset → allow (local/dev) with banner warning.
 * If set → require cookie `icso_mc_token` or header `x-icso-mc-token`.
 */

import { cookies, headers } from 'next/headers';

export type McAccessResult =
  | { allowed: true; gated: boolean }
  | { allowed: false; gated: true; reason: string };

export async function resolveIcsoMcAccess(): Promise<McAccessResult> {
  const expected = process.env.ICSO_MC_ACCESS_TOKEN?.trim() ?? '';
  if (!expected) {
    return { allowed: true, gated: false };
  }

  const headerStore = await headers();
  const fromHeader = headerStore.get('x-icso-mc-token')?.trim() ?? '';
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get('icso_mc_token')?.value?.trim() ?? '';

  if (fromHeader === expected || fromCookie === expected) {
    return { allowed: true, gated: true };
  }

  return {
    allowed: false,
    gated: true,
    reason: 'Mission Control requires ICSO_MC_ACCESS_TOKEN (cookie icso_mc_token or header x-icso-mc-token).',
  };
}
