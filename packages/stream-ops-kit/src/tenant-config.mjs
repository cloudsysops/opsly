// Carga stream.config.json del tenant (obsConfigPath, apiBase, obsSceneNames,
// audioTracks, game, overlaySourceName). Cacheado: se lee una sola vez por proceso.
import fs from 'node:fs';
import { tenantPath } from './tenant-paths.mjs';

let cached = null;

export function tenantConfig() {
  if (cached) return cached;
  const file = tenantPath('stream.config.json');
  try {
    cached = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`No se pudo leer ${file}: ${error.message}`);
  }
  return cached;
}
