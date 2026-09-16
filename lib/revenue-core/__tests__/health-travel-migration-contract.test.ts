import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/0102_health_travel_revenue_receipts.sql'),
  'utf8'
);

describe('0102 Health Travel revenue receipts migration', () => {
  it('provides tenant-scoped delivery and business idempotency', () => {
    expect(migration).toContain('platform.revenue_event_receipts');
    expect(migration).toContain('UNIQUE (tenant_id, source_system, external_event_id)');
    expect(migration).toContain('uq_revenue_event_receipts_business_dedupe');
    expect(migration).toContain(
      'ON platform.revenue_event_receipts(tenant_id, source_system, business_dedupe_key)'
    );
    expect(migration).toContain('WHERE business_dedupe_key IS NOT NULL');
    expect(migration).toContain("CHECK (btrim(lead_ref) <> '')");
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('supports exclusive receipt processing with a recoverable lease', () => {
    expect(migration).toContain("'received','processing','applied'");
    expect(migration).toContain('claim_token uuid');
    expect(migration).toContain('processing_started_at timestamptz');
    expect(migration).toContain('idx_revenue_event_receipts_processing_lease');
  });

  it('enforces tenant matching for every referenced ledger row', () => {
    for (const constraint of [
      'revenue_attributions_tenant_id_id_key',
      'revenue_referrals_tenant_id_id_key',
      'revenue_commission_events_tenant_id_id_key',
      'revenue_event_receipts_attribution_tenant_fk',
      'revenue_event_receipts_referral_tenant_fk',
      'revenue_event_receipts_commission_tenant_fk',
    ]) {
      expect(migration).toContain(constraint);
    }
    expect(migration).toContain(
      'FOREIGN KEY (tenant_id, attribution_id)'
    );
    expect(migration).toContain(
      'REFERENCES platform.revenue_attributions(tenant_id, id)'
    );
    expect(migration).toContain('FOREIGN KEY (tenant_id, referral_id)');
    expect(migration).toContain(
      'REFERENCES platform.revenue_referrals(tenant_id, id)'
    );
    expect(migration).toContain('FOREIGN KEY (tenant_id, commission_event_id)');
    expect(migration).toContain(
      'REFERENCES platform.revenue_commission_events(tenant_id, id)'
    );
  });

  it('prevents duplicate SmileTripCare commission estimates by business key', () => {
    expect(migration).toContain('uq_revenue_commission_event_external_source');
    expect(migration).toContain(
      'ON platform.revenue_commission_events(tenant_id, referral_id, source, external_ref)'
    );
    expect(migration).toContain(
      "WHERE source = 'smile-trip-care' AND external_ref IS NOT NULL"
    );
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
