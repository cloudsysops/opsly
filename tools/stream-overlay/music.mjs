// Actualiza el widget "Sonando ahora" y (por defecto) copia el patrón al portapapeles.
//   node music.mjs techno|house|buildup|drop [--no-copy]   patrón del catálogo
//   node music.mjs "Texto libre" ["detalle"]               texto propio (p. ej. tu propio patrón)
//   node music.mjs off                                     oculta el widget
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const dir = new URL('./music/', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('catalog.json', dir), 'utf8'));
const args = process.argv.slice(2);
const copy = !args.includes('--no-copy');
const [key, ...rest] = args.filter((a) => !a.startsWith('--'));
if (!key) { console.log(`uso: music.mjs <${Object.keys(catalog).join('|')}|off|"texto libre" ["detalle"]> [--no-copy]`); process.exit(1); }

let name = '', detail = '';
if (key === 'off') { /* widget oculto */ }
else if (catalog[key]) {
  ({ name, detail } = catalog[key]);
  if (copy) {
    const file = new URL(catalog[key].file, dir);
    execFileSync('powershell', ['-NoProfile', '-Command', `Set-Clipboard -Value ([IO.File]::ReadAllText('${file.pathname.slice(1)}', [Text.Encoding]::UTF8))`]);
  }
} else { name = key; detail = rest.join(' '); }

fs.writeFileSync(new URL('nowplaying.txt', dir), `${name}\n${detail}\n`);
console.log(JSON.stringify({ nowPlaying: name || null, detail, copiedToClipboard: Boolean(catalog[key] && copy) }));
