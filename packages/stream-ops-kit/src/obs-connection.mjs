// Lee el config.json de obs-websocket (puerto + contraseña) desde la ruta que
// declare el tenant en stream.config.json (`obsConfigPath`). Antes esta lectura
// estaba duplicada en más de una decena de scripts, cada uno con la ruta hardcodeada.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { tenantConfig } from './tenant-config.mjs';

export function readObsWebsocketConfig() {
  const { obsConfigPath } = tenantConfig();
  if (!obsConfigPath) throw new Error('stream.config.json no define "obsConfigPath".');
  return JSON.parse(fs.readFileSync(obsConfigPath, 'utf8'));
}

export function authenticate(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}
