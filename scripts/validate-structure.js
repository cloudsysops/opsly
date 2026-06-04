#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const { findDocsRootViolations, CONFIG_REL: DOCS_CONFIG_REL } = require('./lib/docs-root-layout');
const {
  CONFIG_REL: ROOT_CONFIG_REL,
  findRootWhitelistViolations,
} = require('./lib/root-whitelist-layout');

const requiredPaths = [
  'apps/mcp',
  'apps/orchestrator',
  'tools/cli',
  'tools/workspaces',
  'tools/agents',
  'runtime',
  'runtime/logs',
  'runtime/tenants',
  'runtime/letsencrypt',
  'docs',
  ROOT_CONFIG_REL,
];

const missing = requiredPaths.filter((relativePath) => {
  const absolutePath = path.join(root, relativePath);
  return !fs.existsSync(absolutePath);
});

if (missing.length > 0) {
  console.error('Missing required structure paths:');
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

const forbiddenRootDirs = ['logs', 'tenants', 'letsencrypt', 'agents', 'workspaces', 'cli'];
const forbiddenPresent = forbiddenRootDirs.filter((relativePath) =>
  fs.existsSync(path.join(root, relativePath)),
);

if (forbiddenPresent.length > 0) {
  console.error('Forbidden root directories found:');
  for (const item of forbiddenPresent) {
    console.error(`- ${item}`);
  }
  console.error(
    'Hint: move contents under runtime/ or tools/ (e.g. logs → runtime/logs/). See docs/00-architecture/REPO-MAP.md § validate-structure.',
  );
  process.exit(1);
}

let rootCheck;
try {
  rootCheck = findRootWhitelistViolations(root, { skipGitIgnored: true });
} catch (error) {
  console.error(`Root whitelist check failed: ${error.message}`);
  process.exit(1);
}

if (rootCheck.violations.length > 0) {
  console.error(`Forbidden or unknown entries at repository root (see ${ROOT_CONFIG_REL}):`);
  for (const item of rootCheck.violations) {
    console.error(`- ${item}`);
  }
  console.error(
    'Hint: move artifacts under runtime/tmp/, docs/, or tools/. Do not expand the whitelist to pass CI — document in docs/reports/REPOSITORY-AUDIT-*.md REVIEW section.',
  );
  process.exit(1);
}

if (rootCheck.symlinkReview.length > 0) {
  console.error('Undocumented root symlinks require human REVIEW before allowlisting:');
  for (const item of rootCheck.symlinkReview) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

let docsViolations = [];
try {
  docsViolations = findDocsRootViolations(root);
} catch (error) {
  console.error(`Docs root layout check failed: ${error.message}`);
  process.exit(1);
}

if (docsViolations.length > 0) {
  console.error(
    'Files at docs/ root must be hubs only (README, index, STRUCTURE-GUARDRAILS); stubs live in docs/stubs/. See docs/STRUCTURE-GUARDRAILS.md:',
  );
  for (const item of docsViolations) {
    console.error(`- docs/${item}`);
  }
  console.error(
    `Hint: move new docs into a owning folder (e.g. docs/01-development/). To extend the exception list, update ${DOCS_CONFIG_REL} with explicit review.`,
  );
  process.exit(1);
}

console.log('Structure validation passed.');
