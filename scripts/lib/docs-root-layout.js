'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CONFIG_REL = 'config/docs-root-allowlist.json';

/**
 * @param {string} repoRoot
 * @returns {Set<string>}
 */
function loadAllowedDocsRootFiles(repoRoot) {
  const configPath = path.join(repoRoot, CONFIG_REL);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${CONFIG_REL}`);
  }
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const files = data.allowed_files;
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(`${CONFIG_REL} must define a non-empty allowed_files array`);
  }
  return new Set(files);
}

/**
 * @param {string} repoRoot
 * @returns {string[]}
 */
function listDocsRootFileNames(repoRoot) {
  const docsDir = path.join(repoRoot, 'docs');
  if (!fs.existsSync(docsDir)) {
    return [];
  }
  return fs
    .readdirSync(docsDir, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

/**
 * @param {string} repoRoot
 * @returns {string[]} file names at docs/ root that are not allowlisted
 */
function findDocsRootViolations(repoRoot) {
  const allowed = loadAllowedDocsRootFiles(repoRoot);
  return listDocsRootFileNames(repoRoot).filter((name) => !allowed.has(name));
}

module.exports = {
  CONFIG_REL,
  loadAllowedDocsRootFiles,
  listDocsRootFileNames,
  findDocsRootViolations,
};
