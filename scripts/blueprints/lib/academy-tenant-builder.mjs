/**
 * Pure functions for the Academy vertical tenant generator.
 * No filesystem/network access here — keeps it unit-testable and lets
 * scripts/blueprints/generate-academy-tenant.mjs stay a thin CLI wrapper.
 */

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const ACADEMY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug) {
  if (typeof slug !== 'string' || !slug) {
    return 'slug is required';
  }
  if (!SLUG_PATTERN.test(slug) || !ACADEMY_SLUG_PATTERN.test(slug)) {
    return 'slug must be lowercase kebab-case, 3-30 chars (e.g. "swim-cali")';
  }
  return null;
}

/** Builds the config/blueprints/academy/instances/<slug>.json contract, matching tenant.schema.json exactly. */
export function buildAcademyInstance(input, blueprintDefaults) {
  const modules = { ...blueprintDefaults.modules, ...(input.moduleOverrides ?? {}) };

  const instance = {
    tenant: {
      slug: input.slug,
      business_type: 'academy',
      owner_platform: 'icso',
      canonical_domain: input.domain,
      locale: input.locale ?? blueprintDefaults.defaults.locale,
      timezone: input.timezone ?? blueprintDefaults.defaults.timezone,
      display_name: input.displayName,
    },
    modules,
    policies: {
      ghl_runtime: 'disabled',
      whatsapp_outbound: 'approval_first',
      payments_live: 'disabled_by_default',
    },
  };

  if (input.franchises) {
    instance.franchises = {
      enabled: true,
      primary: {
        slug: input.franchises.primarySlug,
        type: 'flagship',
        is_primary: true,
      },
      ...(input.franchises.mobileSlug
        ? {
            owned_mobile: {
              slug: input.franchises.mobileSlug,
              type: 'mobile',
            },
          }
        : {}),
    };
  } else {
    instance.franchises = { enabled: false };
  }

  return instance;
}

const REQUIRED_TENANT_KEYS = [
  'slug',
  'business_type',
  'owner_platform',
  'canonical_domain',
  'locale',
  'timezone',
];
const REQUIRED_MODULE_KEYS = [
  'auth',
  'crm',
  'franchises',
  'classes',
  'families',
  'teachers',
  'automation',
  'messaging',
  'payments',
  'analytics',
];

/** Hand-rolled check against tenant.schema.json's shape (no ajv dependency for a one-schema script). */
export function validateAcademyInstance(instance) {
  const errors = [];
  for (const key of REQUIRED_TENANT_KEYS) {
    if (instance.tenant?.[key] === undefined) errors.push(`tenant.${key} is required`);
  }
  if (instance.tenant?.business_type !== 'academy')
    errors.push('tenant.business_type must be "academy"');
  if (instance.tenant?.owner_platform !== 'icso')
    errors.push('tenant.owner_platform must be "icso"');
  for (const key of REQUIRED_MODULE_KEYS) {
    if (instance.modules?.[key] === undefined) errors.push(`modules.${key} is required`);
  }
  if (instance.policies?.ghl_runtime !== 'disabled')
    errors.push('policies.ghl_runtime must be "disabled"');
  if (
    instance.policies?.whatsapp_outbound !== 'approval_first' &&
    instance.policies?.whatsapp_outbound !== 'disabled'
  ) {
    errors.push('policies.whatsapp_outbound must be "approval_first" or "disabled"');
  }
  if (instance.policies?.payments_live !== 'disabled_by_default') {
    errors.push('policies.payments_live must be "disabled_by_default"');
  }
  return errors;
}

function toSchemaName(slug) {
  return slug.replace(/-/g, '_');
}

/** Next free port, scanning existing config/tenants/*.json internal_port values. */
export function pickNextPort(existingPorts, basePort = 3004) {
  const used = new Set(existingPorts.filter((p) => Number.isInteger(p)));
  let port = basePort;
  while (used.has(port)) port += 1;
  return port;
}

const DEFAULT_MODULES_ENABLED = ['twenty', 'n8n', 'uptime'];

/** Builds config/tenants/<slug>.tenant.json, matching schema.tenant-config.json. */
export function buildTenantConfig(input, existingPorts) {
  return {
    tenant_name: input.displayName,
    tenant_slug: input.slug,
    schema_name: toSchemaName(input.slug),
    platform_domain: input.platformDomain ?? 'op-sly.com',
    public_url: input.domain,
    internal_port: pickNextPort(existingPorts),
    stack_type: 'incubator-app',
    owner_email: input.ownerEmail,
    vertical: 'academy',
    modules_enabled: input.modulesEnabled ?? DEFAULT_MODULES_ENABLED,
    bundle: input.bundle ?? 'starter',
    pricing_per_unit: 0,
    currency: 'USD',
    notes: `Academy vertical tenant generated from config/blueprints/academy (pilot: peskids). Franchises: ${input.franchises ? 'enabled' : 'disabled'}.`,
  };
}

const REQUIRED_CONFIG_KEYS = ['tenant_name', 'tenant_slug', 'schema_name', 'platform_domain'];

export function validateTenantConfig(config) {
  const errors = [];
  for (const key of REQUIRED_CONFIG_KEYS) {
    if (!config[key]) errors.push(`${key} is required`);
  }
  if (config.tenant_slug && !SLUG_PATTERN.test(config.tenant_slug)) {
    errors.push('tenant_slug does not match the required pattern');
  }
  return errors;
}

/** Templates the academy blueprint's seed/*.json files for the new tenant. */
export function buildSeedFiles(input, seedTemplates) {
  const files = {
    'tenant-settings.json': {
      tenant: {
        slug: input.slug,
        business_type: 'academy',
        owner_platform: 'icso',
        canonical_domain: input.domain,
        locale: input.locale ?? seedTemplates.blueprintDefaults.defaults.locale,
        timezone: input.timezone ?? seedTemplates.blueprintDefaults.defaults.timezone,
        display_name: input.displayName,
      },
    },
    'roles.json': {
      ...seedTemplates.roles,
      tenant_slug: input.slug,
    },
  };

  if (input.franchises) {
    const primary = {
      slug: input.franchises.primarySlug,
      type: 'flagship',
      is_primary: true,
      display_name: input.franchises.primaryDisplayName ?? input.franchises.primarySlug,
      service_modes: [input.franchises.primarySlug],
      notes: 'Sede/franquicia principal generada por el generador de tenants Academy.',
    };
    const franchises = [primary];
    if (input.franchises.mobileSlug) {
      franchises.push({
        slug: input.franchises.mobileSlug,
        type: 'mobile',
        is_primary: false,
        display_name: input.franchises.mobileDisplayName ?? input.franchises.mobileSlug,
        service_modes: ['domicilio'],
        notes: 'Operación móvil generada por el generador de tenants Academy.',
      });
    }
    files['franchise-defaults.json'] = { tenant_slug: input.slug, franchises };
  }

  return files;
}

/** Assembles the concrete "what's left to do manually" checklist from the ops module catalog. */
export function buildNextStepsChecklist(input, moduleCatalog) {
  const modulesEnabled = input.modulesEnabled ?? DEFAULT_MODULES_ENABLED;
  const steps = [];
  let totalMinutes = 0;

  const substitute = (s) =>
    typeof s === 'string'
      ? s
          .replaceAll('${slug}', input.slug)
          .replaceAll('${SLUG}', input.slug.toUpperCase().replaceAll('-', '_'))
      : s;

  for (const moduleId of modulesEnabled) {
    const mod = moduleCatalog.modules[moduleId];
    if (!mod) continue;
    totalMinutes += mod.estimated_setup_minutes ?? 0;
    steps.push({
      module: mod.name,
      bootstrap: substitute(mod.bootstrap_script),
      smoke: substitute(mod.smoke_script),
      manual_steps: (mod.manual_steps ?? []).map(substitute),
      estimated_setup_minutes: mod.estimated_setup_minutes ?? 0,
    });
  }

  steps.push({
    module: 'Registro del tenant (billing/infra)',
    bootstrap: `./scripts/opsly.sh create-tenant ${input.slug} --email ${input.ownerEmail} --plan starter`,
    smoke: null,
    manual_steps: ['Confirmar plan/precio con el equipo antes de --plan business|enterprise'],
    estimated_setup_minutes: 5,
  });
  totalMinutes += 5;

  return { steps, totalMinutes };
}
