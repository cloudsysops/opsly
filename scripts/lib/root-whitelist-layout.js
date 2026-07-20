'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const CONFIG_REL = 'config/root-whitelist.json';

/** Documented symlink names at repo root (also listed in allowed_folders). */
const DOCUMENTED_ROOT_SYMLINKS = new Set(['context', 'skills']);

/**
 * @param {string} repoRoot
 * @returns {import('fs').PathLike}
 */
function loadWhitelist(repoRoot) {
  const configPath = path.join(repoRoot, CONFIG_REL);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing ${CONFIG_REL}`);
  }
  const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(data.allowed_files) || !Array.isArray(data.allowed_folders)) {
    throw new Error(`${CONFIG_REL} must define allowed_files and allowed_folders`);
  }
  return data;
}

/**
 * @param {string} pattern glob-like with *
 * @param {string} name
 */
function globMatch(pattern, name) {
  const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return regex.test(name);
}

/**
 * @param {string} repoRoot
 * @param {string} name
 * @returns {boolean}
 */
function isGitIgnored(repoRoot, name) {
  const gitDir = path.join(repoRoot, '.git');
  if (!fs.existsSync(gitDir)) {
    return false;
  }
  try {
    execSync(`git check-ignore -q -- "${name}"`, { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {object} whitelist
 * @param {string} fileName
 * @returns {'allowed'|'blocked'|'unknown'}
 */
function classifyRootFile(whitelist, fileName) {
  if (whitelist.allowed_files.includes(fileName)) {
    return 'allowed';
  }
  const blocked = (whitelist.blocked_patterns ?? []).some((pattern) => globMatch(pattern, fileName));
  if (blocked) {
    return 'blocked';
  }
  return 'unknown';
}

/**
 * @param {object} whitelist
 * @param {string} folderName
 * @returns {'allowed'|'blocked'|'unknown'}
 */
function classifyRootFolder(whitelist, folderName) {
  const allowedFolders = new Set(whitelist.allowed_folders ?? []);
  const allowedHidden = new Set(whitelist.allowed_hidden_folders ?? []);
  if (allowedFolders.has(folderName) || allowedHidden.has(folderName)) {
    return 'allowed';
  }
  const blockedHidden = (whitelist.blocked_hidden_patterns ?? []).some((pattern) =>
    globMatch(pattern, folderName),
  );
  if (blockedHidden) {
    return 'blocked';
  }
  return 'unknown';
}

/**
 * @param {string} repoRoot
 * @param {{ skipGitIgnored?: boolean }} [options]
 * @returns {{ violations: string[]; symlinkReview: string[] }}
 */
function findRootWhitelistViolations(repoRoot, options = {}) {
  const skipGitIgnored = options.skipGitIgnored !== false;
  const whitelist = loadWhitelist(repoRoot);
  const violations = [];
  const symlinkReview = [];

  const entries = fs.readdirSync(repoRoot, { withFileTypes: true });

  for (const entry of entries) {
    const name = entry.name;
    // Git worktrees use a `.git` *file*; bare checkouts use a directory. Both are valid.
    if (name === '.git') {
      continue;
    }
    if (skipGitIgnored && isGitIgnored(repoRoot, name)) {
      continue;
    }

    if (entry.isSymbolicLink()) {
      if (DOCUMENTED_ROOT_SYMLINKS.has(name)) {
        continue;
      }
      if (classifyRootFolder(whitelist, name) === 'allowed') {
        continue;
      }
      symlinkReview.push(
        `${name} → ${fs.readlinkSync(path.join(repoRoot, name))} (symlink no documentado; requiere REVIEW)`,
      );
      continue;
    }

    if (entry.isFile()) {
      const status = classifyRootFile(whitelist, name);
      if (status === 'allowed') {
        continue;
      }
      if (status === 'blocked') {
        violations.push(`${name} (patrón bloqueado en ${CONFIG_REL})`);
        continue;
      }
      violations.push(`${name} (no está en allowed_files)`);
      continue;
    }

    if (entry.isDirectory()) {
      const status = classifyRootFolder(whitelist, name);
      if (status === 'allowed') {
        continue;
      }
      if (status === 'blocked') {
        violations.push(`${name}/ (patrón oculto bloqueado en ${CONFIG_REL})`);
        continue;
      }
      violations.push(`${name}/ (no está en allowed_folders ni allowed_hidden_folders)`);
    }
  }

  return { violations, symlinkReview };
}

module.exports = {
  CONFIG_REL,
  DOCUMENTED_ROOT_SYMLINKS,
  loadWhitelist,
  globMatch,
  isGitIgnored,
  classifyRootFile,
  classifyRootFolder,
  findRootWhitelistViolations,
};
