import type { CollectionStatus } from './memory-store';

export interface ParsedCollectionUpdate {
  stickerNumber: number;
  status: CollectionStatus;
}

const NUMBER_PATTERN = /\b(\d{1,4})\b/g;

function inferStatus(utterance: string): CollectionStatus {
  const lower = utterance.toLowerCase();
  if (/(repetid|duplicad|sobra)/.test(lower)) {
    return 'duplicate';
  }
  if (/(falta|necesito|busco|want)/.test(lower)) {
    return 'want';
  }
  if (/(no tengo|missing)/.test(lower)) {
    return 'missing';
  }
  return 'owned';
}

/** Demo parser — domain logic lives in the app, not opsly-core. */
export function parseCollectionUpdatesFromUtterance(utterance: string): ParsedCollectionUpdate[] {
  const segments = utterance.split(/\s+y\s+|\s*,\s*/i).map((s) => s.trim()).filter(Boolean);
  const parts = segments.length > 0 ? segments : [utterance];
  const updates: ParsedCollectionUpdate[] = [];

  for (const segment of parts) {
    const status = inferStatus(segment);
    for (const match of segment.matchAll(NUMBER_PATTERN)) {
      const n = Number.parseInt(match[1] ?? '', 10);
      if (Number.isFinite(n) && n > 0 && n <= 999) {
        updates.push({ stickerNumber: n, status });
      }
    }
  }

  return updates;
}
