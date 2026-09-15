import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), '../../supabase/migrations/0101_revenue_core.sql'),
  'utf8'
);

describe('0101 revenue core migration contract', () => {
  it('is transactional', () => {
    expect(migration.trimStart().startsWith('-- Opsly Revenue Core')).toBe(true);
    expect(migration).toMatch(/\bBEGIN;/);
    expect(migration).toMatch(/\bCOMMIT;/);
  });

  it('creates the six canonical tenant-scoped revenue tables', () => {
    for (const table of [
      'revenue_partners',
      'revenue_offers',
      'revenue_attributions',
      'revenue_referrals',
      'revenue_commission_events',
      'revenue_payouts',
    ]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS platform.${table}`);
      expect(migration).toContain(
        `ALTER TABLE platform.${table} ENABLE ROW LEVEL SECURITY`
      );
    }
    expect((migration.match(/tenant_id uuid NOT NULL REFERENCES platform\.tenants\(id\)/g) ?? []).length)
      .toBeGreaterThanOrEqual(6);
  });

  it('records agent attribution without becoming a clinical record', () => {
    expect(migration).toContain('agent_task_request_id text');
    for (const forbidden of [
      'diagnosis',
      'medical_history',
      'clinical_notes',
      'prescription',
      'lab_results',
      'imaging',
    ]) {
      expect(migration.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('does not implement money movement', () => {
    expect(migration).not.toMatch(/stripe|wompi|bank_account|card_token|transfer_funds/i);
  });
});
