import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const cfg = JSON.parse(
  await fs.readFile(path.join(root, 'config/games/retro-lab.json'), 'utf8'),
);

const errors = [];

if (cfg.policy.externalGameFiles !== 'user-selected-local-only') {
  errors.push('external game files must remain local-user-selected only');
}
if (cfg.policy.bundledThirdPartyGameFiles !== false) {
  errors.push('third-party game files cannot be bundled');
}
if (cfg.policy.bundledThirdPartyAssets !== false) {
  errors.push('third-party game assets cannot be bundled');
}
if (cfg.policy.openSourceRuntimeOnly !== true) {
  errors.push('emulator runtime must remain open source');
}
if (cfg.emulatorFrontend.license !== 'GPL-3.0') {
  errors.push('EmulatorJS license must remain explicit');
}
for (const template of cfg.mechanicTemplates) {
  if (template.ownership !== 'opsly-original') {
    errors.push(`${template.id}: mechanic template must use original expression`);
  }
}

if (errors.length) {
  console.error('Retro Games Lab validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Retro Games Lab: OK · ${cfg.mechanicTemplates.length} original templates · ${cfg.enabledSystems.length} local-file emulator systems`,
);
