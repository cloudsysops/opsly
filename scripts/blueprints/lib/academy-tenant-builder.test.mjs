import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAcademyInstance,
  buildNextStepsChecklist,
  buildSeedFiles,
  buildTenantConfig,
  pickNextPort,
  validateAcademyInstance,
  validateSlug,
  validateTenantConfig,
} from './academy-tenant-builder.mjs';

const BLUEPRINT_DEFAULTS = {
  defaults: { locale: 'es-CO', timezone: 'America/Bogota' },
  modules: {
    auth: true,
    crm: 'twenty',
    franchises: true,
    classes: true,
    families: true,
    teachers: true,
    automation: 'n8n',
    messaging: 'manual_then_wacrm',
    payments: 'disabled',
    analytics: true,
  },
};

test('validateSlug accepts kebab-case slugs', () => {
  assert.equal(validateSlug('swim-cali'), null);
  assert.equal(validateSlug('abc'), null);
});

test('validateSlug rejects invalid slugs', () => {
  assert.ok(validateSlug(''));
  assert.ok(validateSlug('Swim_Cali'));
  assert.ok(validateSlug('-swim'));
  assert.ok(validateSlug(undefined));
});

test('buildAcademyInstance produces a schema-valid instance with franchises', () => {
  const instance = buildAcademyInstance(
    {
      slug: 'swim-cali',
      displayName: 'Swim Cali',
      domain: 'https://www.swimcali.com',
      franchises: { primarySlug: 'swim-cali-principal', mobileSlug: 'swim-cali-domicilios' },
    },
    BLUEPRINT_DEFAULTS
  );

  assert.equal(instance.tenant.slug, 'swim-cali');
  assert.equal(instance.tenant.business_type, 'academy');
  assert.equal(instance.tenant.owner_platform, 'icso');
  assert.equal(instance.modules.crm, 'twenty');
  assert.equal(instance.franchises.enabled, true);
  assert.equal(instance.franchises.primary.slug, 'swim-cali-principal');
  assert.equal(instance.franchises.owned_mobile.slug, 'swim-cali-domicilios');
  assert.deepEqual(validateAcademyInstance(instance), []);
});

test('buildAcademyInstance without franchises disables them', () => {
  const instance = buildAcademyInstance(
    {
      slug: 'swim-cali',
      displayName: 'Swim Cali',
      domain: 'https://www.swimcali.com',
      franchises: null,
    },
    BLUEPRINT_DEFAULTS
  );
  assert.equal(instance.franchises.enabled, false);
  assert.deepEqual(validateAcademyInstance(instance), []);
});

test('validateAcademyInstance catches a broken instance', () => {
  const errors = validateAcademyInstance({ tenant: {}, modules: {}, policies: {} });
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('tenant.slug')));
});

test('pickNextPort skips ports already in use', () => {
  assert.equal(pickNextPort([3004, 3005], 3004), 3006);
  assert.equal(pickNextPort([], 3004), 3004);
  assert.equal(pickNextPort([3004, 3006], 3004), 3005);
});

test('buildTenantConfig derives schema_name and picks a free port', () => {
  const config = buildTenantConfig(
    {
      slug: 'swim-cali',
      displayName: 'Swim Cali',
      domain: 'https://www.swimcali.com',
      ownerEmail: 'owner@swimcali.com',
      franchises: null,
    },
    [3004, 3005]
  );
  assert.equal(config.schema_name, 'swim_cali');
  assert.equal(config.internal_port, 3006);
  assert.equal(config.vertical, 'academy');
  assert.deepEqual(validateTenantConfig(config), []);
});

test('buildSeedFiles includes franchise-defaults.json only when franchises are enabled', () => {
  const withFranchises = buildSeedFiles(
    {
      slug: 'swim-cali',
      displayName: 'Swim Cali',
      domain: 'https://www.swimcali.com',
      franchises: { primarySlug: 'swim-cali-principal' },
    },
    { blueprintDefaults: BLUEPRINT_DEFAULTS, roles: { roles: [] } }
  );
  assert.ok(withFranchises['franchise-defaults.json']);
  assert.equal(withFranchises['tenant-settings.json'].tenant.slug, 'swim-cali');

  const withoutFranchises = buildSeedFiles(
    {
      slug: 'swim-cali',
      displayName: 'Swim Cali',
      domain: 'https://www.swimcali.com',
      franchises: null,
    },
    { blueprintDefaults: BLUEPRINT_DEFAULTS, roles: { roles: [] } }
  );
  assert.equal(withoutFranchises['franchise-defaults.json'], undefined);
});

test('buildNextStepsChecklist substitutes slug placeholders and sums time estimates', () => {
  const catalog = {
    modules: {
      twenty: {
        name: 'Twenty CRM',
        bootstrap_script: 'scripts/tenants/bootstrap-twenty.sh --tenant ${slug}',
        smoke_script: 'scripts/tenants/twenty-crm-smoke.sh --tenant ${slug}',
        manual_steps: ['Crear API key para ${SLUG}'],
        estimated_setup_minutes: 20,
      },
    },
  };
  const { steps, totalMinutes } = buildNextStepsChecklist(
    { slug: 'swim-cali', ownerEmail: 'owner@swimcali.com', modulesEnabled: ['twenty'] },
    catalog
  );
  const twentyStep = steps.find((s) => s.module === 'Twenty CRM');
  assert.equal(twentyStep.bootstrap, 'scripts/tenants/bootstrap-twenty.sh --tenant swim-cali');
  assert.equal(twentyStep.manual_steps[0], 'Crear API key para SWIM_CALI');
  assert.equal(totalMinutes, 25); // 20 (twenty) + 5 (tenant registration, always appended)
});

test('buildNextStepsChecklist tolerates modules with null bootstrap/smoke scripts', () => {
  const catalog = {
    modules: {
      uptime: {
        name: 'Uptime monitor',
        bootstrap_script: null,
        smoke_script: null,
        estimated_setup_minutes: 10,
      },
    },
  };
  const { steps, totalMinutes } = buildNextStepsChecklist(
    { slug: 'swim-cali', ownerEmail: 'owner@swimcali.com', modulesEnabled: ['uptime'] },
    catalog
  );
  const uptimeStep = steps.find((s) => s.module === 'Uptime monitor');
  assert.equal(uptimeStep.bootstrap, null);
  assert.equal(uptimeStep.smoke, null);
  assert.equal(totalMinutes, 15); // 10 (uptime) + 5 (tenant registration)
});
