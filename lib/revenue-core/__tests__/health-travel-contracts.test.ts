import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), '../..');

function readJson(relativePath: string): Record<string, any> {
  return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8')) as Record<string, any>;
}

const intake = readJson('config/vertical-blueprints/health-travel-colombia.intake-schema.json');
const journey = readJson('config/vertical-blueprints/health-travel-colombia.journey-schema.json');
const blueprint = readJson('config/vertical-blueprints/health-travel-colombia.json');
const launchSchema = readJson('config/client-launch.schema.json');

const forbiddenClinicalFields = [
  'diagnosis',
  'medical_history',
  'clinical_notes',
  'prescription',
  'prescriptions',
  'lab_results',
  'imaging',
  'genetic_data',
  'treatment_decision',
];

function explicitForbiddenFields(schema: Record<string, any>): string[] {
  return (schema.not?.anyOf ?? [])
    .flatMap((entry: Record<string, any>) => entry.required ?? [])
    .filter((value: unknown): value is string => typeof value === 'string');
}

describe('Health Travel Colombia contracts', () => {
  it('uses enforceable JSON Schema keywords for the commercial intake boundary', () => {
    expect(intake.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(intake.type).toBe('object');
    expect(intake.additionalProperties).toBe(false);
    expect(intake.properties).toBeTypeOf('object');
    expect(intake.fields).toBeUndefined();
    expect(intake.forbidden_fields).toBeUndefined();

    expect(intake.required).toEqual(
      expect.arrayContaining([
        'traveler_name',
        'origin_country',
        'requested_service_category',
        'preferred_dates',
        'preferred_language',
        'consent_to_contact',
      ])
    );
    expect(intake.required).not.toContain('traveler_ref');
    expect(intake.properties.consent_to_contact).toEqual({ const: true });

    const explicitForbidden = explicitForbiddenFields(intake);
    for (const field of forbiddenClinicalFields) {
      expect(intake.properties[field]).toBeUndefined();
      expect(explicitForbidden).toContain(field);
    }
  });

  it('uses the same non-clinical boundary for persisted journey records', () => {
    expect(journey.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(journey.type).toBe('object');
    expect(journey.additionalProperties).toBe(false);
    expect(journey.properties).toBeTypeOf('object');
    expect(journey.fields).toBeUndefined();
    expect(journey.forbidden_fields).toBeUndefined();
    expect(journey.required).toContain('requested_service_category');
    expect(journey.required).not.toContain('requested_service');

    const explicitForbidden = explicitForbiddenFields(journey);
    for (const field of forbiddenClinicalFields) {
      expect(journey.properties[field]).toBeUndefined();
      expect(explicitForbidden).toContain(field);
    }
  });

  it('keeps generated form fields aligned with the intake contract', () => {
    expect(blueprint.form_fields).toEqual(
      expect.arrayContaining([
        'traveler_name',
        'phone',
        'email',
        'origin_country',
        'preferred_city',
        'requested_service_category',
        'preferred_dates',
        'budget_range',
        'companions',
        'preferred_language',
        'mobility_coordination',
        'consent_to_contact',
      ])
    );
    expect(blueprint.form_fields).not.toEqual(
      expect.arrayContaining(['requested_service', 'language', 'mobility_requirements'])
    );
    expect(blueprint.supabase_records).toEqual(
      expect.arrayContaining([
        'platform.tenants',
        'platform.leads',
        'platform.revenue_partners',
        'platform.revenue_offers',
        'platform.revenue_attributions',
        'platform.revenue_referrals',
        'platform.revenue_commission_events',
        'platform.revenue_payouts',
      ])
    );
    expect(blueprint.revenue_records).toBeUndefined();
  });

  it('clones Health Travel into a launch contract without blueprint-only metadata', () => {
    const output = execFileSync(
      'bash',
      [
        resolve(root, 'scripts/provisioning/clone-vertical-launch.sh'),
        '--vertical',
        'health-travel-colombia',
        '--slug',
        'health-travel-contract-test',
        '--business-name',
        'Health Travel Contract Test',
        '--domain',
        'health-travel-contract-test.op-sly.com',
        '--email',
        'owner@example.com',
        '--dry-run',
      ],
      { cwd: root, encoding: 'utf8' }
    );

    const marker = '\n\nDRY RUN:';
    const markerIndex = output.indexOf(marker);
    expect(markerIndex).toBeGreaterThan(0);
    const launch = JSON.parse(output.slice(0, markerIndex)) as Record<string, unknown>;

    const allowed = new Set(Object.keys(launchSchema.properties));
    for (const key of Object.keys(launch)) {
      expect(allowed.has(key), `unexpected launch key: ${key}`).toBe(true);
    }
    for (const required of launchSchema.required as string[]) {
      expect(launch).toHaveProperty(required);
    }

    for (const blueprintOnly of [
      'target_markets',
      'destination_cities',
      'safety_boundaries',
      'data_minimization',
    ]) {
      expect(launch).not.toHaveProperty(blueprintOnly);
    }

    expect(launch).toMatchObject({
      external_services: blueprint.external_services,
      journey_stages: blueprint.journey_stages,
      provider_types: blueprint.provider_types,
      supabase_records: blueprint.supabase_records,
    });
  });
});
