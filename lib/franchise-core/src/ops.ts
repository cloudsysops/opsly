import type { Supplier, SupportCase, TrainingCompletion } from './types.js';

const MS_PER_HOUR = 3_600_000;

export function supplierBlocksProcurement(supplier: Supplier): boolean {
  return supplier.status === 'suspended' || supplier.status === 'expired';
}

export function trainingCompletionExpired(row: TrainingCompletion, nowIso: string): boolean {
  if (row.status === 'expired') return true;
  if (!row.expiresAt) return false;
  return row.expiresAt <= nowIso;
}

export function supportSlaBreached(row: SupportCase, nowIso: string): boolean {
  if (row.status === 'resolved' || row.status === 'closed') return false;
  if (row.slaHours == null) return false;
  const due = Date.parse(row.createdAt) + row.slaHours * MS_PER_HOUR;
  return Date.parse(nowIso) >= due;
}
