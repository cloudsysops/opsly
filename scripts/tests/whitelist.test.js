#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const WHITELIST_PATH = path.join(ROOT, 'config/root-whitelist.json');

function testWhitelistExists() {
  console.log('\n📋 Verificando existencia de whitelist...');
  if (fs.existsSync(WHITELIST_PATH)) {
    console.log('  ✅ config/root-whitelist.json existe');
    return true;
  }
  console.log('  ❌ config/root-whitelist.json NO existe');
  return false;
}

function testRootFilesCompliance() {
  console.log('\n🔍 Verificando archivos en raíz...');
  const whitelist = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
  const rootFiles = fs.readdirSync(ROOT).filter((f) => fs.statSync(path.join(ROOT, f)).isFile());

  let blockedIssues = 0;
  for (const file of rootFiles) {
    if (whitelist.allowed_files.includes(file)) {
      console.log(`  ✅ ${file}`);
      continue;
    }
    const blocked = whitelist.blocked_patterns.some((pattern) => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(file);
    });
    if (blocked) {
      console.log(`  ❌ ${file} (patrón bloqueado)`);
      blockedIssues++;
    } else {
      console.log(`  ⚠️ ${file} (no está en whitelist, advertencia)`);
    }
  }

  return blockedIssues === 0;
}

function testBlockedPatterns() {
  console.log('\n🚫 Verificando patrones bloqueados...');
  const whitelist = JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
  const testFiles = ['TODO.md', 'NOTES.md', 'TEMP.txt', 'test.bak'];
  let passed = 0;

  for (const file of testFiles) {
    const shouldBlock = whitelist.blocked_patterns.some((pattern) => {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return regex.test(file);
    });
    if (shouldBlock) {
      console.log(`  ✅ ${file} sería bloqueado correctamente`);
      passed++;
    } else {
      console.log(`  ⚠️ ${file} no coincide con ningún patrón bloqueado`);
    }
  }

  return passed === testFiles.length;
}

console.log('═══════════════════════════════════════════════════════');
console.log('🧪 TEST DE WHITELIST DE RAÍZ');
console.log('═══════════════════════════════════════════════════════');

const results = {
  exists: testWhitelistExists(),
  compliance: testRootFilesCompliance(),
  patterns: testBlockedPatterns(),
};

console.log('\n═══════════════════════════════════════════════════════');
console.log('📊 RESUMEN');
console.log('═══════════════════════════════════════════════════════');

const allPassed = Object.values(results).every(Boolean);
if (allPassed) {
  console.log('✅ TODOS LOS TESTS PASARON');
  process.exit(0);
}

console.log('❌ ALGUNOS TESTS FALLARON');
process.exit(1);
