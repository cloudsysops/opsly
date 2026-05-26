export function buildPeskidsReferralLink(code: string, baseUrl?: string | null): string {
  const origin = (
    baseUrl?.trim() ||
    process.env.NEXT_PUBLIC_PESKIDS_SITE_URL ||
    'https://peskids.op-sly.com'
  ).replace(/\/$/, '');
  return `${origin}/familias?ref=${encodeURIComponent(code)}`;
}

export function normalizeReferralCode(value?: string | null): string | null {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}
