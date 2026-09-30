// Actualiza el widget "Sonando ahora" y (por defecto) copia el patrón al portapapeles.
//   node music.mjs techno|house|buildup|drop [--no-copy]   patrón del catálogo
//   node music.mjs "Texto libre" ["detalle"]               texto propio (p. ej. tu propio patrón)
//   node music.mjs off                                     oculta el widget
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tenantPath } from './tenant-paths.mjs';

const dir = tenantPath('music');
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalog.json'), 'utf8'));
const args = process.argv.slice(2);
const copy = !args.includes('--no-copy');
const [key, ...rest] = args.filter((a) => !a.startsWith('--'));
if (!key) { console.log(`uso: music.mjs <${Object.keys(catalog).join('|')}|off|"texto libre" ["detalle"]> [--no-copy]`); process.exit(1); }

let name = '', detail = '';
if (key === 'off') { /* widget oculto */ }
else if (catalog[key]) {
  ({ name, detail } = catalog[key]);
  if (copy) {
    const file = path.join(dir, catalog[key].file);
    execFileSync('powershell', ['-NoProfile', '-Command', `Set-Clipboard -Value ([IO.File]::ReadAllText('${file}', [Text.Encoding]::UTF8))`]);
  }
} else { name = key; detail = rest.join(' '); }

fs.writeFileSync(path.join(dir, 'nowplaying.txt'), `${name}\n${detail}\n`);
console.log(JSON.stringify({ nowPlaying: name || null, detail, copiedToClipboard: Boolean(catalog[key] && copy) }));
