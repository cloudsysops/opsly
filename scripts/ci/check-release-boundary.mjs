#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const deployPath = '.github/workflows/deploy.yml';
const promotePath = '.github/workflows/promote-production-canary.yml';

const deploy = readFileSync(deployPath, 'utf8');
const promote = readFileSync(promotePath, 'utf8');

const deployJob = deploy.match(/\n  deploy:\n([\s\S]*?)(?=\n  [A-Za-z0-9_-]+:\n|\s*$)/);
if (!deployJob) {
  throw new Error(`Could not locate legacy production deploy job in ${deployPath}`);
}

const legacyBlock = deployJob[1];
const legacyDisabled = /\n\s+if:\s+(?:false|\$\{\{\s*false\s*\}\})\s*(?:\n|$)/.test(legacyBlock);
if (!legacyDisabled) {
  throw new Error(
    'Release boundary violation: deploy.yml production job is still activatable. ' +
      'Normal pushes/merges to main must never deploy production; production activation belongs only to the explicit release-candidate promotion workflow.',
  );
}

const requiredPromotionContracts = [
  [/\brelease_sha:\s*\n/, 'required release_sha input'],
  [/environment:\s*production\b/, 'protected production environment'],
  [/git merge-base --is-ancestor/, 'main ancestry validation'],
  [/Verify every immutable release image exists/, 'immutable image existence gate'],
  [/APP_IMAGE_TAG=\"\$RELEASE_SHA\"/, 'exact API image tag promotion'],
  [/ADMIN_IMAGE_TAG=\"\$RELEASE_SHA\"/, 'exact Admin image tag promotion'],
  [/PORTAL_IMAGE_TAG=\"\$RELEASE_SHA\"/, 'exact Portal image tag promotion'],
];

for (const [pattern, description] of requiredPromotionContracts) {
  if (!pattern.test(promote)) {
    throw new Error(`Release boundary violation: promotion workflow is missing ${description}`);
  }
}

console.log('Release boundary OK: main integration is separated from explicit production promotion.');
