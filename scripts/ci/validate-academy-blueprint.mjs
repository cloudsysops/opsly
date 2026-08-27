import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '../..');
const BLUEPRINT_DIR = path.join(ROOT, 'docs/blueprints/academy');
const MACHINE_PACK_DIR = path.join(ROOT, 'config/blueprints/academy');
const MODULE_FILES = [
  'auth.yaml',
  'crm.yaml',
  'franchises.yaml',
  'franchise-os.yaml',
  'classes.yaml',
  'families.yaml',
  'teachers.yaml',
  'automation.yaml',
  'messaging.yaml',
  'payments.yaml',
  'analytics.yaml',
];
const YAML_FILES = [
  'blueprint.yaml',
  'capabilities.yaml',
  'integrations.yaml',
  'roles.yaml',
  'agent-policy.yaml',
];
const CONTRACT_FILES = [...YAML_FILES, 'tenant.schema.json'];

function fail(message) {
  console.error(`validate-academy-blueprint: ${message}`);
  process.exit(1);
}

function readContract(name) {
  const filePath = path.join(BLUEPRINT_DIR, name);
  if (!fs.existsSync(filePath)) {
    fail(`missing ${name}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function parseYaml(name) {
  try {
    return YAML.parse(readContract(name));
  } catch (error) {
    fail(`${name} is not valid YAML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const name of YAML_FILES) {
  const parsed = parseYaml(name);
  if (!parsed || typeof parsed !== 'object') {
    fail(`${name} must contain an object`);
  }
}

let tenantSchema;
try {
  tenantSchema = JSON.parse(readContract('tenant.schema.json'));
} catch (error) {
  fail(
    `tenant.schema.json is not valid JSON: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

const blueprint = parseYaml('blueprint.yaml');
if (blueprint?.metadata?.id !== 'academy' || blueprint?.spec?.provisioning?.enabled !== false) {
  fail('blueprint must be academy and provisioning must remain disabled');
}

for (const reference of [
  blueprint?.spec?.tenantSchema,
  blueprint?.spec?.capabilities,
  blueprint?.spec?.integrations,
  blueprint?.spec?.roles,
  blueprint?.spec?.agentPolicy,
]) {
  if (typeof reference !== 'string' || !reference.startsWith('./')) {
    fail(`invalid blueprint reference: ${String(reference)}`);
  }
  if (!fs.existsSync(path.resolve(BLUEPRINT_DIR, reference))) {
    fail(`blueprint reference does not exist: ${reference}`);
  }
}

if (
  tenantSchema?.type !== 'object' ||
  tenantSchema?.properties?.crm_provider?.const !== 'twenty'
) {
  fail('tenant schema must require Twenty as the Academy CRM provider');
}

const integrations = parseYaml('integrations.yaml')?.spec?.integrations;
if (!Array.isArray(integrations)) {
  fail('integrations.yaml must define spec.integrations');
}

const twenty = integrations.find((entry) => entry?.id === 'twenty');
const wacrm = integrations.find((entry) => entry?.id === 'wacrm');
if (twenty?.defaultEnabled !== true || wacrm?.defaultEnabled !== false) {
  fail('Twenty must default on and WACRM must default off');
}

const forbiddenPattern = /gohighlevel|GHL_|PESKIDS_GHL|ghl_runtime/;
for (const name of CONTRACT_FILES) {
  if (forbiddenPattern.test(readContract(name))) {
    fail(`${name} contains a legacy CRM reference`);
  }
}

const machineRequired = [
  'blueprint.yaml',
  'tenant.schema.json',
  'README.md',
  'seed/franchise-defaults.json',
  'seed/tenant-settings.json',
];
for (const relative of machineRequired) {
  const filePath = path.join(MACHINE_PACK_DIR, relative);
  if (!fs.existsSync(filePath)) {
    fail(`missing machine pack file config/blueprints/academy/${relative}`);
  }
  if (forbiddenPattern.test(fs.readFileSync(filePath, 'utf8'))) {
    fail(`config/blueprints/academy/${relative} contains a legacy CRM reference`);
  }
}

for (const moduleName of MODULE_FILES) {
  const filePath = path.join(MACHINE_PACK_DIR, 'modules', moduleName);
  if (!fs.existsSync(filePath)) {
    fail(`missing module config/blueprints/academy/modules/${moduleName}`);
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (forbiddenPattern.test(raw)) {
      fail(`config/blueprints/academy/modules/${moduleName} contains a legacy CRM reference`);
    }
    const parsed = YAML.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.id) {
      fail(`module ${moduleName} must define id`);
    }
  } catch (error) {
    fail(
      `module ${moduleName} is not valid YAML: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

const machineBlueprint = YAML.parse(
  fs.readFileSync(path.join(MACHINE_PACK_DIR, 'blueprint.yaml'), 'utf8')
);
if (machineBlueprint?.metadata?.ownerPlatform !== 'icso') {
  fail('config/blueprints/academy/blueprint.yaml must set metadata.ownerPlatform=icso');
}
if (machineBlueprint?.metadata?.pilotTenant !== 'peskids') {
  fail('config/blueprints/academy/blueprint.yaml must set metadata.pilotTenant=peskids');
}

console.log(
  `validate-academy-blueprint: OK (${CONTRACT_FILES.length} docs contracts + ${MODULE_FILES.length} modules)`
);
