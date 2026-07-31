#!/usr/bin/env node
/**
 * Generates the file layer for a new Academy-vertical tenant from
 * config/blueprints/academy — turns "read 8 files and hand-copy/edit 5 of
 * them" into one validated command. Does NOT touch a live database, deploy
 * anything, or flip config/blueprints/academy/blueprint.yaml's
 * provisioning.enabled (that stays false on purpose — see
 * scripts/ci/validate-academy-blueprint.mjs). It only writes local config,
 * seed, and contract files, then prints the exact remaining manual/infra
 * steps (sourced from config/tenant-modules-catalog.json) with a total
 * time estimate.
 *
 * Usage:
 *   node scripts/blueprints/generate-academy-tenant.mjs \
 *     --slug swim-cali --display-name "Swim Cali" \
 *     --domain https://www.swimcali.com --owner-email owner@swimcali.com \
 *     [--no-franchises] [--primary-franchise-slug flagship] \
 *     [--mobile-franchise-slug domicilios] [--write]
 *
 * Without --write, this is a dry-run: it prints what would be created.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import {
  buildAcademyInstance,
  buildNextStepsChecklist,
  buildSeedFiles,
  buildTenantConfig,
  validateAcademyInstance,
  validateSlug,
  validateTenantConfig,
} from './lib/academy-tenant-builder.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const MACHINE_PACK_DIR = path.join(ROOT, 'config/blueprints/academy');
const TENANTS_DIR = path.join(ROOT, 'config/tenants');
const INSTANCES_DIR = path.join(MACHINE_PACK_DIR, 'instances');

function fail(message) {
  console.error(`generate-academy-tenant: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { write: false, franchises: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--slug':
        args.slug = argv[++i];
        break;
      case '--display-name':
        args.displayName = argv[++i];
        break;
      case '--domain':
        args.domain = argv[++i];
        break;
      case '--owner-email':
        args.ownerEmail = argv[++i];
        break;
      case '--locale':
        args.locale = argv[++i];
        break;
      case '--timezone':
        args.timezone = argv[++i];
        break;
      case '--primary-franchise-slug':
        args.primaryFranchiseSlug = argv[++i];
        break;
      case '--primary-franchise-name':
        args.primaryFranchiseName = argv[++i];
        break;
      case '--mobile-franchise-slug':
        args.mobileFranchiseSlug = argv[++i];
        break;
      case '--mobile-franchise-name':
        args.mobileFranchiseName = argv[++i];
        break;
      case '--no-franchises':
        args.franchises = false;
        break;
      case '--write':
        args.write = true;
        break;
      case '--force':
        args.force = true;
        break;
      default:
        fail(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadYaml(filePath) {
  return YAML.parse(fs.readFileSync(filePath, 'utf8'));
}

function collectExistingPorts() {
  const ports = [];
  for (const file of fs.readdirSync(TENANTS_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_') || file.startsWith('schema.')) continue;
    try {
      const config = loadJson(path.join(TENANTS_DIR, file));
      if (Number.isInteger(config.internal_port)) ports.push(config.internal_port);
    } catch {
      // ignore malformed/unrelated files
    }
  }
  return ports;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const slugError = validateSlug(args.slug);
  if (slugError) fail(slugError);
  if (!args.displayName) fail('--display-name is required');
  if (!args.domain) fail('--domain is required (e.g. https://www.example.com)');
  if (!args.ownerEmail) fail('--owner-email is required');

  const instancePath = path.join(INSTANCES_DIR, `${args.slug}.json`);
  const tenantConfigPath = path.join(TENANTS_DIR, `${args.slug}.tenant.json`);
  if (!args.force && (fs.existsSync(instancePath) || fs.existsSync(tenantConfigPath))) {
    fail(`tenant "${args.slug}" already has generated files — pass --force to overwrite`);
  }

  const blueprintDefaults = loadYaml(path.join(MACHINE_PACK_DIR, 'blueprint.yaml')).spec;
  const roles = loadJson(path.join(MACHINE_PACK_DIR, 'seed/roles.json'));
  const moduleCatalog = loadJson(path.join(ROOT, 'config/tenant-modules-catalog.json'));

  const franchises = args.franchises
    ? {
        primarySlug: args.primaryFranchiseSlug ?? `${args.slug}-principal`,
        primaryDisplayName: args.primaryFranchiseName,
        mobileSlug: args.mobileFranchiseSlug,
        mobileDisplayName: args.mobileFranchiseName,
      }
    : null;

  const input = {
    slug: args.slug,
    displayName: args.displayName,
    domain: args.domain,
    ownerEmail: args.ownerEmail,
    locale: args.locale,
    timezone: args.timezone,
    franchises,
  };

  const instance = buildAcademyInstance(input, blueprintDefaults);
  const instanceErrors = validateAcademyInstance(instance);
  if (instanceErrors.length > 0) {
    fail(`generated academy instance failed validation:\n  - ${instanceErrors.join('\n  - ')}`);
  }

  const existingPorts = collectExistingPorts();
  const tenantConfig = buildTenantConfig(input, existingPorts);
  const configErrors = validateTenantConfig(tenantConfig);
  if (configErrors.length > 0) {
    fail(`generated tenant config failed validation:\n  - ${configErrors.join('\n  - ')}`);
  }

  const seedFiles = buildSeedFiles(input, { blueprintDefaults, roles });
  const { steps, totalMinutes } = buildNextStepsChecklist(
    { slug: args.slug, ownerEmail: args.ownerEmail, modulesEnabled: tenantConfig.modules_enabled },
    moduleCatalog
  );

  const seedDir = path.join(TENANTS_DIR, args.slug, 'seed');
  const plannedFiles = [
    [instancePath, instance],
    [tenantConfigPath, tenantConfig],
    ...Object.entries(seedFiles).map(([name, content]) => [path.join(seedDir, name), content]),
  ];

  console.log(
    `\nAcademy tenant "${args.slug}" — ${args.write ? 'WRITING' : 'DRY RUN (pass --write to create files)'}\n`
  );
  for (const [filePath] of plannedFiles) {
    console.log(`  ${args.write ? 'wrote' : 'would write'}  ${path.relative(ROOT, filePath)}`);
  }

  if (args.write) {
    fs.mkdirSync(INSTANCES_DIR, { recursive: true });
    fs.mkdirSync(seedDir, { recursive: true });
    for (const [filePath, content] of plannedFiles) {
      fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
    }
  }

  console.log('\nPasos restantes (infra/manuales) — no ejecutados por este generador:\n');
  for (const step of steps) {
    console.log(`  • ${step.module} (~${step.estimated_setup_minutes} min)`);
    if (step.bootstrap) console.log(`      ${step.bootstrap}`);
    if (step.smoke) console.log(`      smoke: ${step.smoke}`);
    for (const manual of step.manual_steps) {
      console.log(`      - ${manual}`);
    }
  }
  console.log(
    `\nTotal estimado: ~${totalMinutes} min (${(totalMinutes / 60).toFixed(1)} h) de trabajo manual restante.\n`
  );

  if (!args.write) {
    console.log('Nada se escribió. Vuelve a correr con --write para generar los archivos.\n');
  }
}

main();
