import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { healthTravelCatalogSchema } from '../health-travel-catalog-sync';

describe('medical-tourism-demo catalog fixture', () => {
  it('matches the strict public catalog contract', () => {
    const path = resolve(
      process.cwd(),
      'docs/tenants/health-travel/fixtures/smiletripcare-catalog.synthetic.json'
    );
    const fixture = JSON.parse(readFileSync(path, 'utf8'));
    const parsed = healthTravelCatalogSchema.parse(fixture);

    expect(parsed.providers).toHaveLength(1);
    expect(parsed.offers).toHaveLength(1);
    expect(parsed.offers[0].provider_id).toBe(parsed.providers[0].id);
    expect(JSON.stringify(parsed)).not.toMatch(
      /contact_email|contact_phone|internal_notes|diagnosis|medical_record/i
    );
  });
});
