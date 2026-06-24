export type LeadSourceDisplay = 'Web' | 'Instagram' | 'WhatsApp' | 'Referido' | 'Sin origen';

export function normalizeLeadSourceLabel(source: string | null | undefined): LeadSourceDisplay {
  if (!source?.trim()) {
    return 'Sin origen';
  }

  const normalized = source.trim().toLowerCase();

  if (
    ['website', 'web', 'site', 'direct', 'organic', 'search', 'google', 'facebook', 'fb', 'meta'].includes(
      normalized
    )
  ) {
    return 'Web';
  }

  if (['instagram', 'ig', 'insta', 'instagram-pilot'].includes(normalized)) {
    return 'Instagram';
  }

  if (['whatsapp', 'wa', 'wsp'].includes(normalized) || normalized.includes('whatsapp')) {
    return 'WhatsApp';
  }

  if (
    ['referral', 'friend', 'referido', 'recommendation', 'recomendation', 'recomendación'].includes(
      normalized
    )
  ) {
    return 'Referido';
  }

  if (normalized === 'other' || normalized === 'not sure' || normalized === 'otro') {
    return 'Sin origen';
  }

  return 'Sin origen';
}
