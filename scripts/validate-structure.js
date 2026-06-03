#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const allowedRootMarkdown = new Set([
  'AGENTS.md',
  'README.md',
  'ROADMAP.md',
  'VISION.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'OPSLY_CONTEXT.md',
  'AGENCY_CONTEXT.md',
]);
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

const rootMarkdownFiles = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => entry.name)
  .filter((fileName) => !allowedRootMarkdown.has(fileName));

if (rootMarkdownFiles.length > 0) {
  console.error('Forbidden Markdown files found in repository root:');
  for (const item of rootMarkdownFiles) {
    console.error(`- ${item}`);
  }
  console.error(
    'Hint: keep root Markdown limited to AGENTS.md, README.md, ROADMAP.md, VISION.md, SECURITY.md (GitHub policy), CONTRIBUTING.md, CODE_OF_CONDUCT.md. Move all other docs under docs/.',
  );
  process.exit(1);
}

const { findDocsRootViolations, CONFIG_REL } = require('./lib/docs-root-layout');
let docsViolations = [];
try {
  docsViolations = findDocsRootViolations(root);
} catch (error) {
  console.error(`Docs root layout check failed: ${error.message}`);
  process.exit(1);
}

if (docsViolations.length > 0) {
  console.error('Files at docs/ root must be hubs only (README, index, STRUCTURE-GUARDRAILS); stubs live in docs/stubs/. See docs/STRUCTURE-GUARDRAILS.md:');
  for (const item of docsViolations) {
    console.error(`- docs/${item}`);
  }
  console.error(
    `Hint: move new docs into a owning folder (e.g. docs/01-development/). To extend the exception list, update ${CONFIG_REL} with explicit review.`,
  );
  process.exit(1);
}

console.log('Structure validation passed.');
