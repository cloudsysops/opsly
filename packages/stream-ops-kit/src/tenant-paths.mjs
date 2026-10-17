// Resuelve rutas dentro de la carpeta de datos del tenant (config, schedule.json,
// activity.json, music/, scenes.mjs, .analysis/). El motor nunca asume una carpeta
// fija: cada tenant la pasa por STREAM_KIT_DATA_DIR (ver README de este paquete).
import path from 'node:path';

export function tenantDataDir() {
  const dir = process.env.STREAM_KIT_DATA_DIR;
  if (!dir) {
    throw new Error(
      'STREAM_KIT_DATA_DIR no está definido. Debe apuntar a la carpeta de datos del ' +
        'tenant (la que tiene stream.config.json, schedule.json, activity.json, music/, scenes.mjs).',
    );
  }
  return dir;
}

export function tenantPath(...segments) {
  return path.join(tenantDataDir(), ...segments);
}
