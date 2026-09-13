import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/0102_health_travel_revenue_receipts.sql'),
  'utf8'
);

describe('0102 Health Travel revenue receipts migration', () => {
  it('provides tenant-scoped event idempotency', () => {
    expect(migration).toContain('platform.revenue_event_receipts');
    expect(migration).toContain('UNIQUE (tenant_id, source_system, external_event_id)');
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('references Revenue Core ledgers instead of duplicating them', () => {
    expect(migration).toContain('platform.revenue_attributions');
    expect(migration).toContain('platform.revenue_referrals');
    expect(migration).toContain('platform.revenue_commission_events');
  });

  it('contains no clinical record or money movement fields', () => {
    for (const forbidden of [
      'diagnosis',
      'medical_history',
      'clinical_notes',
      'prescription',
      'lab_results',
      'imaging',
      'bank_account',
      'card_token',
      'transfer_funds',
    ]) {
      expect(migration.toLowerCase()).not.toContain(forbidden);
    }
  });
});
