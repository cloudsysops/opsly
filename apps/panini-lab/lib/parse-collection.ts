import type { CollectionStatus } from './memory-store';

export interface ParsedCollectionUpdate {
  stickerNumber: number;
  status: CollectionStatus;
  country: string | null;
  playerName: string | null;
}

// Canonical country name → ISO alpha-2 code for flag emoji lookup
export const COUNTRY_ALIASES: Record<string, string> = {
  argentina: 'AR',
  brasil: 'BR',
  brazil: 'BR',
  colombia: 'CO',
  uruguay: 'UY',
  chile: 'CL',
  paraguay: 'PY',
  ecuador: 'EC',
  peru: 'PE',
  perú: 'PE',
  bolivia: 'BO',
  venezuela: 'VE',
  españa: 'ES',
  espana: 'ES',
  spain: 'ES',
  francia: 'FR',
  france: 'FR',
  alemania: 'DE',
  germany: 'DE',
  portugal: 'PT',
  italia: 'IT',
  italy: 'IT',
  holanda: 'NL',
  netherlands: 'NL',
  belgica: 'BE',
  bélgica: 'BE',
  belgium: 'BE',
  croacia: 'HR',
  croatia: 'HR',
  suiza: 'CH',
  switzerland: 'CH',
  inglaterra: 'GB',
  england: 'GB',
  uk: 'GB',
  mexico: 'MX',
  méxico: 'MX',
  usa: 'US',
  'estados unidos': 'US',
  canada: 'CA',
  canadá: 'CA',
  marruecos: 'MA',
  morocco: 'MA',
  nigeria: 'NG',
  senegal: 'SN',
  japon: 'JP',
  japón: 'JP',
  japan: 'JP',
  corea: 'KR',
  korea: 'KR',
  australia: 'AU',
  'nueva zelanda': 'NZ',
  ghana: 'GH',
  camerun: 'CM',
  camerún: 'CM',
  egypt: 'EG',
  egipto: 'EG',
  arabia: 'SA',
  'arabia saudita': 'SA',
  iran: 'IR',
  irán: 'IR',
  qatar: 'QA',
};

export function countryToFlag(isoCode: string): string {
  return isoCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)))
    .join('');
}

export function resolveCountry(raw: string): string | null {
  const normalized = raw.toLowerCase().trim();
  const code = COUNTRY_ALIASES[normalized] ?? null;
  if (!code) return null;
  // Return display name (capitalize first letter of raw)
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

const NUMBER_PATTERN = /\b(\d{1,4})\b/g;

// Matches "de Colombia", "de la Argentina", "de Brasil" — captures up to 2 words
const COUNTRY_AFTER_NUMBER =
  /\bde(?:\s+l[ao]s?)?\s+([A-Za-záéíóúÁÉÍÓÚñÑüÜ]+(?:\s+[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+)?)/i;

function inferStatus(utterance: string): CollectionStatus {
  const lower = utterance.toLowerCase();
  if (/(repetid|duplicad|sobra|de más|tengo de más)/.test(lower)) return 'duplicate';
  if (/(falta|necesito|busco|quiero|want|me falta)/.test(lower)) return 'want';
  if (/(no tengo|missing)/.test(lower)) return 'missing';
  return 'owned';
}

function extractCountryFromSegment(segment: string): string | null {
  const m = segment.match(COUNTRY_AFTER_NUMBER);
  if (!m) return null;
  const raw = m[1]?.trim() ?? '';
  // Try 2-word match first, then 1-word (handles "estados unidos" vs single names)
  const twoWord = resolveCountry(raw);
  if (twoWord) return twoWord;
  const oneWord = raw.split(/\s+/)[0] ?? '';
  return resolveCountry(oneWord);
}

/** Domain parser — lives in the app, not opsly-core. */
export function parseCollectionUpdatesFromUtterance(utterance: string): ParsedCollectionUpdate[] {
  const segments = utterance
    .split(/\s+y\s+|\s*,\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts = segments.length > 0 ? segments : [utterance];
  const updates: ParsedCollectionUpdate[] = [];

  for (const segment of parts) {
    const status = inferStatus(segment);
    const country = extractCountryFromSegment(segment);

    for (const match of segment.matchAll(NUMBER_PATTERN)) {
      const n = Number.parseInt(match[1] ?? '', 10);
      if (Number.isFinite(n) && n > 0 && n <= 999) {
        updates.push({ stickerNumber: n, status, country, playerName: null });
      }
    }
  }

  return updates;
}
