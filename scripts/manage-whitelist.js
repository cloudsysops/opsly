#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WHITELIST_PATH = path.join(ROOT, 'config/root-whitelist.json');

function loadWhitelist() {
  if (!fs.existsSync(WHITELIST_PATH)) {
    console.error('❌ Archivo de whitelist no encontrado');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(WHITELIST_PATH, 'utf8'));
}

function saveWhitelist(whitelist) {
  fs.writeFileSync(WHITELIST_PATH, `${JSON.stringify(whitelist, null, 2)}\n`);
  console.log('✅ Whitelist actualizada');
}

function listFiles() {
  const whitelist = loadWhitelist();

  console.log('\n📋 ARCHIVOS PERMITIDOS EN RAÍZ:');
  console.log('═══════════════════════════════════');
  for (const file of whitelist.allowed_files) {
    console.log(`  ✓ ${file}`);
  }

  console.log('\n📁 CARPETAS PERMITIDAS EN RAÍZ:');
  console.log('═══════════════════════════════════');
  for (const folder of whitelist.allowed_folders) {
    console.log(`  ✓ ${folder}/`);
  }

  console.log('\n🚫 PATRONES BLOQUEADOS:');
  console.log('═══════════════════════════════════');
  for (const pattern of whitelist.blocked_patterns) {
    console.log(`  ✗ ${pattern}`);
  }
}

function addFile(filename) {
  const whitelist = loadWhitelist();
  if (whitelist.allowed_files.includes(filename)) {
    console.log(`⚠️ ${filename} ya está en la whitelist`);
    return;
  }
  whitelist.allowed_files.push(filename);
  whitelist.allowed_files.sort();
  saveWhitelist(whitelist);
  console.log(`✅ ${filename} añadido a la whitelist`);
}

function removeFile(filename) {
  const whitelist = loadWhitelist();
  const idx = whitelist.allowed_files.indexOf(filename);
  if (idx === -1) {
    console.log(`⚠️ ${filename} no está en la whitelist`);
    return;
  }
  whitelist.allowed_files.splice(idx, 1);
  saveWhitelist(whitelist);
  console.log(`✅ ${filename} eliminado de la whitelist`);
}

function checkFile(filename) {
  const whitelist = loadWhitelist();

  if (whitelist.allowed_files.includes(filename)) {
    console.log(`✅ ${filename} está permitido`);
    return true;
  }

  for (const pattern of whitelist.blocked_patterns) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    if (regex.test(filename)) {
      console.log(`🚫 ${filename} coincide con patrón bloqueado: ${pattern}`);
      return false;
    }
  }

  console.log(`⚠️ ${filename} NO está en la whitelist`);
  return false;
}

const [, , command, arg] = process.argv;

switch (command) {
  case undefined:
  case 'list':
    listFiles();
    break;
  case 'add':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js add <filename>');
      process.exit(1);
    }
    addFile(arg);
    break;
  case 'remove':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js remove <filename>');
      process.exit(1);
    }
    removeFile(arg);
    break;
  case 'check':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js check <filename>');
      process.exit(1);
    }
    checkFile(arg);
    break;
  default:
    console.error(`Comando desconocido: ${command}`);
    console.log('Comandos disponibles: list, add, remove, check');
    process.exit(1);
}
