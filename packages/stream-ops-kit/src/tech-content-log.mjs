// Registro de momentos técnicos con potencial de contenido (pilar "Vibe Coding"),
// separado de activity.json (que es el resumen en vivo del overlay). Se acumula
// sesión tras sesión para armar el plan de contenido técnico sin depender de la
// memoria de nadie.
//   node tech-content-log.mjs "Título corto" "Por qué es interesante" [corto|largo]
//   node tech-content-log.mjs --list
import fs from 'node:fs';
import { tenantPath } from './tenant-paths.mjs';

const file = tenantPath('tech-content-ideas.jsonl');
const [, , a, b, c] = process.argv;

if (a === '--list') {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  for (const l of lines) { const e = JSON.parse(l); console.log(`[${e.format}] ${e.title} — ${e.why}`); }
  console.log(`\n${lines.length} momentos registrados.`);
  process.exit(0);
}

if (!a || !b) { console.log('uso: tech-content-log.mjs "Título" "Por qué interesa" [corto|largo]'); process.exit(1); }
const entry = { t: new Date().toISOString(), title: a, why: b, format: c ?? 'corto' };
fs.appendFileSync(file, JSON.stringify(entry) + '\n');
console.log(JSON.stringify(entry));
