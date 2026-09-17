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
  [/RELEASE_SERVICE_IMAGES:/, 'canonical compose-service to image mapping'],
  [/app=api\b/, 'explicit app compose service to API image mapping'],
  [/read -r -a release_pairs <<< \"\$RELEASE_SERVICE_IMAGES\"/, 'shared release mapping parser'],
  [/image=\"ghcr\.io\/cloudsysops\/intcloudsysops-\$\{image_service\}:\$\{RELEASE_SHA\}\"/, 'verification derived from canonical image mapping'],
  [/services\+=\(\"\$compose_service\"\)/, 'promotion service list derived from canonical mapping'],
];

for (const [pattern, description] of requiredPromotionContracts) {
  if (!pattern.test(promote)) {
    throw new Error(`Release boundary violation: promotion workflow is missing ${description}`);
  }
}

const mappingBlock = promote.match(/RELEASE_SERVICE_IMAGES:\s*>-\s*\n([\s\S]*?)(?=\n\S|\nconcurrency:)/);
if (!mappingBlock) {
  throw new Error('Release boundary violation: could not parse RELEASE_SERVICE_IMAGES mapping');
}

const pairs = mappingBlock[1]
  .split(/\s+/)
  .map((value) => value.trim())
  .filter((value) => value.includes('='));

const mappings = new Map();
for (const pair of pairs) {
  const [composeService, imageService, ...rest] = pair.split('=');
  if (!composeService || !imageService || rest.length > 0) {
    throw new Error(`Release boundary violation: invalid release mapping entry ${pair}`);
  }
  if (mappings.has(composeService)) {
    throw new Error(`Release boundary violation: duplicate compose service mapping ${composeService}`);
  }
  mappings.set(composeService, imageService);
}

const expectedMappings = new Map([
  ['app', 'api'],
  ['admin', 'admin'],
  ['portal', 'portal'],
  ['icso', 'icso'],
  ['mcp', 'mcp'],
  ['llm-gateway', 'llm-gateway'],
  ['orchestrator', 'orchestrator'],
  ['hermes', 'hermes'],
  ['context-builder', 'context-builder'],
]);

if (mappings.size !== expectedMappings.size) {
  throw new Error(
    `Release boundary violation: expected ${expectedMappings.size} promoted services, found ${mappings.size}`,
  );
}

for (const [composeService, imageService] of expectedMappings) {
  if (mappings.get(composeService) !== imageService) {
    throw new Error(
      `Release boundary violation: ${composeService} must verify/promote image ${imageService}`,
    );
  }
}

console.log('Release boundary OK: main integration is separated from explicit production promotion, and every promoted compose service is bound to a verified immutable image.');
