const LEGACY_AGE_RANGES: Record<string, string> = {
  'K-5': '3 meses–5 años',
  '6-8': '6–8 años',
  '9-12': '9–12 años',
  Other: 'Edad por confirmar',
};

export function formatAgeRange(value: string | number | null | undefined): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Edad por confirmar';
  if (LEGACY_AGE_RANGES[normalized]) return LEGACY_AGE_RANGES[normalized];
  if (/^\d+\s*[a-z]$/i.test(normalized)) return 'Edad por confirmar';
  if (/^(?:grado|grade|nivel|level)\b/i.test(normalized)) return 'Edad por confirmar';
  if (/^\d+$/.test(normalized)) return `${normalized} años`;

  const range = normalized.match(/^(\d+)\s*(?:-|–|a)\s*(\d+)(?:\s*años)?$/i);
  if (range) return `${range[1]}–${range[2]} años`;
  if (/^\d+\s*años$/i.test(normalized)) return normalized.toLowerCase();

  return normalized;
}

export function classFormatLabel(capacity: number): string {
  if (capacity === 1) return 'Clase individual';
  if (capacity === 3 || capacity === 4) return `Grupo pequeño · ${capacity} niños`;
  if (Number.isInteger(capacity) && capacity > 1) return `Formato por revisar · ${capacity} cupos`;
  return 'Formato por confirmar';
}
