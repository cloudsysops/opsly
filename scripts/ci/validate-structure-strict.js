#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const WHITELIST_PATH = path.join(ROOT, 'config/root-whitelist.json');
const IS_CI = process.env.CI === 'true';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  process.stdout.write(`${colors[color] ?? ''}${message}${colors.reset}\n`);
}

function loadWhitelist() {
  if (!fs.existsSync(WHITELIST_PATH)) {
    log('Whitelist config not found: config/root-whitelist.json', 'red');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
}

function wildcardToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

function validateRequiredDirectories() {
  log('\nValidating required directories...', 'blue');
  const required = [
    'apps',
    'packages',
    'tools',
    'infra',
    'scripts',
    'config',
    'docs',
    'runtime',
    'runtime/logs',
    'runtime/tenants',
    'runtime/letsencrypt',
    'tools/agents',
    'tools/workspaces',
    'tools/cli',
  ];
  let failed = 0;
  for (const dir of required) {
    if (fs.existsSync(path.join(ROOT, dir))) log(`  OK ${dir}`, 'green');
    else {
      log(`  MISSING ${dir}`, 'red');
      failed++;
    }
  }
  return failed === 0;
}

function validateForbiddenInRoot() {
  log('\nValidating forbidden directories in root...', 'blue');
  const forbidden = ['logs', 'tenants', 'letsencrypt', 'agents', 'workspaces', 'cli'];
  let clean = true;
  for (const dir of forbidden) {
    if (fs.existsSync(path.join(ROOT, dir))) {
      log(`  FORBIDDEN ${dir}/ exists`, 'red');
      clean = false;
    } else log(`  OK ${dir}/ absent`, 'green');
  }
  return clean;
}

function validateRootFiles() {
  log('\nValidating files in root...', 'blue');
  const whitelist = loadWhitelist();
  const rootFiles = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
  let violations = 0;
  for (const file of rootFiles) {
    if (whitelist.allowed_files.includes(file)) {
      log(`  OK ${file}`, 'green');
      continue;
    }
    const blocked = (whitelist.blocked_patterns ?? []).some((p) => wildcardToRegex(p).test(file));
    log(`  ${blocked ? 'BLOCKED' : 'UNLISTED'} ${file}`, blocked ? 'red' : 'yellow');
    violations++;
  }
  return IS_CI ? violations === 0 : true;
}

function validateRootFolders() {
  log('\nValidating folders in root...', 'blue');
  const whitelist = loadWhitelist();
  const rootFolders = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);
  let violations = 0;
  for (const folder of rootFolders) {
    if (whitelist.allowed_folders.includes(folder)) log(`  OK ${folder}/`, 'green');
    else {
      log(`  UNLISTED ${folder}/`, 'yellow');
      violations++;
    }
  }
  return IS_CI ? violations === 0 : true;
}

function validateHiddenFolders() {
  log('\nValidating hidden folders in root...', 'blue');
  const whitelist = loadWhitelist();
  const hiddenFolders = fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('.'))
    .map((e) => e.name);
  let violations = 0;
  for (const folder of hiddenFolders) {
    const allowed = (whitelist.allowed_hidden_folders ?? []).includes(folder);
    const blocked = (whitelist.blocked_hidden_patterns ?? []).some((p) =>
      wildcardToRegex(p).test(folder),
    );
    if (allowed) log(`  OK ${folder}/`, 'green');
    else {
      log(`  ${blocked ? 'BLOCKED' : 'UNLISTED'} ${folder}/`, blocked ? 'red' : 'yellow');
      violations++;
    }
  }
  return IS_CI ? violations === 0 : true;
}

function validateLegacyReferences() {
  log('\nScanning for legacy path references...', 'blue');
  const legacyExpr = [
    '\\./lo' + 'gs',
    '\\./ten' + 'ants',
    '\\./letsen' + 'crypt',
    '/opt/opsly/lo' + 'gs',
  ].join('|');
  const cmd =
    "rg -n --glob '*.{ts,tsx,js,mjs,cjs,sh,yml,yaml,md}' " +
    "--glob '!node_modules/**' --glob '!.next/**' --glob '!dist/**' " +
    "--glob '!scripts/hooks/structure-guard.sh' --glob '!scripts/ci/validate-structure-strict.js' " +
    "--glob '!scripts/tests/structure-integrity.test.js' " +
    `"(${legacyExpr})" .`;
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const lines = out.trim().split('\n').filter(Boolean);
    if (lines.length > 0) {
      log(`  Found ${lines.length} potential legacy references`, 'yellow');
      for (const line of lines.slice(0, 10)) log(`    ${line}`, 'yellow');
      if (lines.length > 10) log(`    ... and ${lines.length - 10} more`, 'yellow');
      return false;
    }
  } catch (_error) {
    log('  OK no legacy references found', 'green');
    return true;
  }
  return true;
}

function validateSymlinks() {
  log('\nChecking symlinks status...', 'blue');
  const symlinks = [
    { path: 'skills', temporary: true },
    { path: 'context', temporary: true },
  ];
  for (const link of symlinks) {
    const full = path.join(ROOT, link.path);
    if (!fs.existsSync(full)) {
      log(`  INFO ${link.path} does not exist`, 'green');
      continue;
    }
    if (fs.lstatSync(full).isSymbolicLink()) {
      const target = fs.readlinkSync(full);
      log(`  WARN ${link.path} -> ${target} (${link.temporary ? 'temporary' : 'permanent'})`, 'yellow');
    } else log(`  INFO ${link.path} is a real directory`, 'green');
  }
  return true;
}

function main() {
  log('========================================', 'blue');
  log('STRICT STRUCTURE VALIDATION', 'blue');
  log(`Mode: ${IS_CI ? 'CI (strict)' : 'Local (permissive)'}`, 'blue');
  log('========================================', 'blue');

  const results = {
    requiredDirs: validateRequiredDirectories(),
    forbidden: validateForbiddenInRoot(),
    files: validateRootFiles(),
    folders: validateRootFolders(),
    hidden: validateHiddenFolders(),
    legacy: validateLegacyReferences(),
    symlinks: validateSymlinks(),
  };

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  log('\nValidation summary:', 'blue');
  for (const [name, ok] of Object.entries(results)) log(`  ${ok ? 'OK' : 'FAIL'} ${name}`, ok ? 'green' : 'red');
  log(`\nResult: ${passed}/${total} checks passed`, passed === total ? 'green' : 'red');

  if (IS_CI && passed < total) process.exit(1);
  process.exit(0);
}

main();
