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

  console.log('\n🔒 CARPETAS OCULTAS PERMITIDAS:');
  console.log('═══════════════════════════════════');
  for (const folder of whitelist.allowed_hidden_folders ?? []) {
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

function normalizeFolder(folderName) {
  return folderName.replace(/\/$/, '');
}

function addFolder(folderName) {
  const whitelist = loadWhitelist();
  const normalized = normalizeFolder(folderName);

  if (whitelist.allowed_folders.includes(normalized)) {
    console.log(`⚠️ ${normalized}/ ya está en la whitelist`);
    return;
  }

  whitelist.allowed_folders.push(normalized);
  whitelist.allowed_folders.sort();
  saveWhitelist(whitelist);
  console.log(`✅ ${normalized}/ añadido a la whitelist de carpetas`);
}

function removeFolder(folderName) {
  const whitelist = loadWhitelist();
  const normalized = normalizeFolder(folderName);

  const idx = whitelist.allowed_folders.indexOf(normalized);
  if (idx === -1) {
    console.log(`⚠️ ${normalized}/ no está en la whitelist`);
    return;
  }

  whitelist.allowed_folders.splice(idx, 1);
  saveWhitelist(whitelist);
  console.log(`✅ ${normalized}/ eliminado de la whitelist de carpetas`);
}

function addHiddenFolder(folderName) {
  const whitelist = loadWhitelist();
  const normalized = normalizeFolder(folderName);

  if (!normalized.startsWith('.')) {
    console.log(`⚠️ ${normalized} no es carpeta oculta (no empieza con .)`);
    console.log('   Usa add-folder para carpetas normales.');
    return;
  }

  if (!whitelist.allowed_hidden_folders) {
    whitelist.allowed_hidden_folders = [];
  }

  if (whitelist.allowed_hidden_folders.includes(normalized)) {
    console.log(`⚠️ ${normalized}/ ya está en whitelist de carpetas ocultas`);
    return;
  }

  whitelist.allowed_hidden_folders.push(normalized);
  whitelist.allowed_hidden_folders.sort();
  saveWhitelist(whitelist);
  console.log(`✅ ${normalized}/ añadido a la whitelist de carpetas ocultas`);
}

function removeHiddenFolder(folderName) {
  const whitelist = loadWhitelist();
  const normalized = normalizeFolder(folderName);

  if (!whitelist.allowed_hidden_folders) {
    console.log('⚠️ No hay whitelist de carpetas ocultas');
    return;
  }

  const idx = whitelist.allowed_hidden_folders.indexOf(normalized);
  if (idx === -1) {
    console.log(`⚠️ ${normalized}/ no está en la whitelist`);
    return;
  }

  whitelist.allowed_hidden_folders.splice(idx, 1);
  saveWhitelist(whitelist);
  console.log(`✅ ${normalized}/ eliminado de la whitelist de carpetas ocultas`);
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
  case 'add-folder':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js add-folder <foldername>');
      process.exit(1);
    }
    addFolder(arg);
    break;
  case 'remove-folder':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js remove-folder <foldername>');
      process.exit(1);
    }
    removeFolder(arg);
    break;
  case 'add-hidden':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js add-hidden <.foldername>');
      process.exit(1);
    }
    addHiddenFolder(arg);
    break;
  case 'remove-hidden':
    if (!arg) {
      console.error('Uso: node scripts/manage-whitelist.js remove-hidden <.foldername>');
      process.exit(1);
    }
    removeHiddenFolder(arg);
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
    console.log('Comandos disponibles: list, add, remove, check, add-folder, remove-folder, add-hidden, remove-hidden');
    process.exit(1);
}
