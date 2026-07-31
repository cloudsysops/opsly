import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance } from 'fastify';
import YAML from 'yaml';
import { z } from 'zod';
// Reuses @intcloudsysops/academy-blueprint — the same builder logic
// scripts/blueprints/generate-academy-tenant.mjs uses. This route is a
// preview only (no filesystem writes); the CLI with --write remains the
// way to actually create tenant files.
import {
  buildAcademyInstance,
  buildNextStepsChecklist,
  buildSeedFiles,
  buildTenantConfig,
  validateAcademyInstance,
  validateSlug,
  validateTenantConfig,
  type BlueprintDefaults,
  type ModuleCatalog,
} from '@intcloudsysops/academy-blueprint';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SRC_DIR, '../../..');
const MACHINE_PACK_DIR = path.join(ROOT, 'config/blueprints/academy');
const TENANTS_DIR = path.join(ROOT, 'config/tenants');

const franchisesSchema = z
  .object({
    primarySlug: z.string().optional(),
    primaryDisplayName: z.string().optional(),
    mobileSlug: z.string().optional(),
    mobileDisplayName: z.string().optional(),
  })
  .nullable()
  .optional();

const onboardAcademyRequestSchema = z.object({
  slug: z.string(),
  displayName: z.string().min(1),
  domain: z.string().url(),
  ownerEmail: z.string().email(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  franchises: franchisesSchema,
});

function loadJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadYaml(filePath: string): unknown {
  return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectExistingPorts(): number[] {
  const ports: number[] = [];
  for (const file of fs.readdirSync(TENANTS_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_') || file.startsWith('schema.')) continue;
    try {
      const config = loadJson(path.join(TENANTS_DIR, file)) as { internal_port?: unknown };
      if (Number.isInteger(config.internal_port)) ports.push(config.internal_port as number);
    } catch {
      // ignore malformed/unrelated files
    }
  }
  return ports;
}

export function registerAcademyOnboardingRoutes(app: FastifyInstance): void {
  app.post('/onboard/academy/preview', async (request, reply) => {
    const parsed = onboardAcademyRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_request', issues: parsed.error.issues });
    }
    const body = parsed.data;

    const slugError = validateSlug(body.slug);
    if (slugError) {
      return reply.status(400).send({ error: slugError });
    }

    const tenantConfigPath = path.join(TENANTS_DIR, `${body.slug}.json`);
    if (fs.existsSync(tenantConfigPath)) {
      return reply.status(409).send({ error: `tenant "${body.slug}" already exists` });
    }

    const blueprintDefaults = (
      loadYaml(path.join(MACHINE_PACK_DIR, 'blueprint.yaml')) as { spec: BlueprintDefaults }
    ).spec;
    const roles = loadJson(path.join(MACHINE_PACK_DIR, 'seed/roles.json')) as Record<
      string,
      unknown
    >;
    const moduleCatalog = loadJson(
      path.join(ROOT, 'config/tenant-modules-catalog.json')
    ) as ModuleCatalog;

    const franchises = body.franchises
      ? {
          primarySlug: body.franchises.primarySlug ?? `${body.slug}-principal`,
          primaryDisplayName: body.franchises.primaryDisplayName,
          mobileSlug: body.franchises.mobileSlug,
          mobileDisplayName: body.franchises.mobileDisplayName,
        }
      : null;

    const input = {
      slug: body.slug,
      displayName: body.displayName,
      domain: body.domain,
      ownerEmail: body.ownerEmail,
      locale: body.locale,
      timezone: body.timezone,
      franchises,
    };

    const instance = buildAcademyInstance(input, blueprintDefaults);
    const instanceErrors = validateAcademyInstance(instance);
    if (instanceErrors.length > 0) {
      return reply
        .status(500)
        .send({ error: 'generated_instance_invalid', details: instanceErrors });
    }

    const existingPorts = collectExistingPorts();
    const tenantConfig = buildTenantConfig(input, existingPorts);
    const configErrors = validateTenantConfig(tenantConfig);
    if (configErrors.length > 0) {
      return reply.status(500).send({ error: 'generated_config_invalid', details: configErrors });
    }

    const seedFiles = buildSeedFiles(input, { blueprintDefaults, roles });
    const { steps, totalMinutes } = buildNextStepsChecklist(
      {
        slug: body.slug,
        ownerEmail: body.ownerEmail,
        modulesEnabled: tenantConfig.modules_enabled,
      },
      moduleCatalog
    );

    return reply.status(200).send({
      instance,
      tenantConfig,
      seedFiles,
      checklist: { steps, totalMinutes },
      note: 'Preview only — nothing was written. Run scripts/blueprints/generate-academy-tenant.mjs --write to create the files.',
    });
  });
}
