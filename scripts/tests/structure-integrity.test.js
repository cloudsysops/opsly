#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

const REQUIRED_DIRS = [
  'runtime',
  'runtime/logs',
  'runtime/tenants',
  'runtime/letsencrypt',
  'tools/agents',
  'tools/workspaces',
  'tools/cli',
];

const FORBIDDEN_ROOT_DIRS = ['logs', 'tenants', 'letsencrypt', 'agents', 'workspaces', 'cli'];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.sh', '.yml', '.yaml', '.md', '.json']);
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'dist', '.next', '.turbo', '.cursor', '.archived']);

const FORBIDDEN_PATTERNS = [
  { pattern: /(?:^|[^A-Za-z0-9_./-])\.\/logs(?:\/|$)/, message: 'Referencia ./runtime/logs/ obsoleta' },
  { pattern: /(?:^|[^A-Za-z0-9_./-])\.\/tenants(?:\/|$)/, message: 'Referencia ./runtime/tenants/ obsoleta' },
  { pattern: /(?:^|[^A-Za-z0-9_./-])\.\/letsencrypt(?:\/|$)/, message: 'Referencia ./runtime/letsencrypt/ obsoleta' },
  { pattern: /\/opt\/opsly\/logs\b/, message: 'Ruta /opt/opsly/runtime/logs/ obsoleta' },
  { pattern: /(?:^|[^A-Za-z0-9_./-])agents\/prompts\b/, message: 'Referencia tools/agents/prompts obsoleta' },
];

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(full, files);
    } else if (entry.isFile()) {
      if (SCAN_EXTENSIONS.has(path.extname(entry.name))) files.push(full);
    }
  }
  return files;
}

function rel(p) {
  return path.relative(ROOT, p) || '.';
}

function testRequiredDirectories() {
  console.log('\n📁 Verificando directorios obligatorios...');
  let ok = true;
  for (const dir of REQUIRED_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
      console.log(`  ✅ ${dir}`);
    } else {
      console.log(`  ❌ ${dir} NO EXISTE`);
      ok = false;
    }
  }
  return ok;
}

function testForbiddenRootDirectories() {
  console.log('\n🚫 Verificando directorios prohibidos en raíz...');
  let ok = true;
  for (const dir of FORBIDDEN_ROOT_DIRS) {
    const full = path.join(ROOT, dir);
    if (fs.existsSync(full)) {
      console.log(`  ❌ ${dir} EXISTE en raíz`);
      ok = false;
    } else {
      console.log(`  ✅ ${dir} no existe en raíz`);
    }
  }
  return ok;
}

function shouldIgnoreMatch(file, message) {
  const normalized = file.split(path.sep).join('/');
  if (normalized.endsWith('/scripts/hooks/structure-guard.sh')) return true;
  if (normalized.endsWith('/scripts/tests/structure-integrity.test.js')) return true;
  if (normalized.endsWith('/scripts/sync-references.sh')) return true;
  if (normalized.endsWith('/docs/00-architecture/hooks-system.md')) return true;
  if (message.includes('tools/agents/prompts') && normalized.includes('/apps/agents/')) return true;
  return false;
}

function testForbiddenPatterns() {
  console.log('\n🔍 Buscando patrones de rutas obsoletas...');
  const files = walk(ROOT);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.pattern.test(content) && !shouldIgnoreMatch(file, rule.message)) {
        violations.push({ file: rel(file), message: rule.message });
      }
    }
  }

  if (violations.length === 0) {
    console.log('  ✅ No se encontraron patrones obsoletos');
    return true;
  }

  for (const violation of violations.slice(0, 40)) {
    console.log(`  ❌ ${violation.message}: ${violation.file}`);
  }
  if (violations.length > 40) {
    console.log(`  … y ${violations.length - 40} más`);
  }
  return false;
}

function testGitkeepFiles() {
  console.log('\n📌 Verificando .gitkeep de runtime...');
  const required = ['runtime/logs/.gitkeep', 'runtime/tenants/.gitkeep', 'runtime/letsencrypt/.gitkeep'];
  let ok = true;
  for (const file of required) {
    if (fs.existsSync(path.join(ROOT, file))) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} NO EXISTE`);
      ok = false;
    }
  }
  return ok;
}

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TEST DE INTEGRIDAD DE ESTRUCTURA');
console.log('═══════════════════════════════════════════════════════');

const results = {
  requiredDirs: testRequiredDirectories(),
  forbiddenDirs: testForbiddenRootDirectories(),
  patterns: testForbiddenPatterns(),
  gitkeep: testGitkeepFiles(),
};

console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 RESUMEN');
console.log('═══════════════════════════════════════════════════════');

const passed = Object.values(results).every(Boolean);
if (passed) {
  console.log('✅ TODOS LOS TESTS PASARON');
  process.exit(0);
}

console.log('❌ ALGUNOS TESTS FALLARON');
process.exit(1);
