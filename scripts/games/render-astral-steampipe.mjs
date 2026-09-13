#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '../..');
const source = path.join(root, 'tools/steam/astral-arena');
const outputRoot = path.resolve(
  process.env.STEAMPIPE_OUTPUT_DIR || path.join(root, 'dist/steam/astral-arena'),
);
const contentRoot = path.resolve(
  process.env.STEAM_CONTENT_ROOT || path.join(root, 'dist/astral-arena'),
);

const appId = (process.env.STEAM_APP_ID || '').trim();
const depotId = (process.env.STEAM_DEPOT_WINDOWS_ID || '').trim();
const buildDesc = (process.env.STEAM_BUILD_DESC || 'private build').trim();

function requireNumeric(name, value) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be provided as a numeric Steam ID`);
  }
}

requireNumeric('STEAM_APP_ID', appId);
requireNumeric('STEAM_DEPOT_WINDOWS_ID', depotId);

if (!fs.existsSync(path.join(contentRoot, 'AstralArena.exe'))) {
  throw new Error(`Windows content root missing AstralArena.exe: ${contentRoot}`);
}

fs.mkdirSync(outputRoot, { recursive: true });
const depotPath = path.join(outputRoot, `depot_build_${depotId}.vdf`);
const appPath = path.join(outputRoot, `app_build_${appId}.vdf`);

const tokens = {
  '{{STEAM_APP_ID}}': appId,
  '{{STEAM_DEPOT_WINDOWS_ID}}': depotId,
  '{{BUILD_DESC}}': buildDesc.replaceAll('"', "'"),
  '{{BUILD_OUTPUT}}': path.join(outputRoot, 'output').replaceAll('\\', '/'),
  '{{CONTENT_ROOT}}': contentRoot.replaceAll('\\', '/'),
  '{{DEPOT_VDF_PATH}}': depotPath.replaceAll('\\', '/'),
};

function render(templateName) {
  let content = fs.readFileSync(path.join(source, templateName), 'utf8');
  for (const [token, value] of Object.entries(tokens)) content = content.replaceAll(token, value);
  if (/{{[A-Z0-9_]+}}/.test(content)) throw new Error(`unresolved token in ${templateName}`);
  return content;
}

fs.writeFileSync(depotPath, render('depot_build_windows.vdf.template'));
fs.writeFileSync(appPath, render('app_build.vdf.template'));

const manifest = {
  schemaVersion: 1,
  appId,
  depotId,
  contentRoot,
  buildDesc,
  appBuildVdf: appPath,
  depotBuildVdf: depotPath,
  generatedAt: new Date().toISOString(),
  uploadExecuted: false,
};
fs.writeFileSync(path.join(outputRoot, 'steampipe-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(JSON.stringify(manifest, null, 2));
