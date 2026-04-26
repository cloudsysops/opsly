#!/usr/bin/env node
/**
 * Capa 1: alinea context/system_state.json con el estado real del repo (apps, scripts, ADRs, migraciones).
 */
const fs = require('fs');
const path = require('path');

// Repo root: this file lives in scripts/utils/ (not scripts/).
const ROOT = path.resolve(__dirname, '..', '..');
const STATE_PATH = path.join(ROOT, 'context/system_state.json');

const current = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

const apps = fs
  .readdirSync(path.join(ROOT, 'apps'))
  .filter((d) => fs.statSync(path.join(ROOT, 'apps', d)).isDirectory());

const scripts = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => f.endsWith('.sh'));

const adrs = fs.existsSync(path.join(ROOT, 'docs/adr'))
  ? fs.readdirSync(path.join(ROOT, 'docs/adr'))
  : [];

const migrations = fs.existsSync(path.join(ROOT, 'supabase/migrations'))
  ? fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'))
  : [];

const updated = {
  ...current,
  last_updated: new Date().toISOString().split('T')[0],
  repo: {
    apps,
    scripts: scripts.length,
    adrs: adrs.length,
    migrations: migrations.length,
  },
};

fs.writeFileSync(STATE_PATH, JSON.stringify(updated, null, 2) + '\n');
console.log('✅ system_state.json actualizado');
console.log(JSON.stringify(updated.repo, null, 2));
