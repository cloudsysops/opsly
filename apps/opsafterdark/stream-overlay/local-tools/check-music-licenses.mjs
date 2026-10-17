// Guardia de licencias: los patrones solo pueden usar los sintetizadores incorporados de Strudel.
// Falla si aparece cualquier carga de samples, bancos de baterías o sonidos de terceros.
import fs from 'node:fs';

const dir = new URL('./music/', import.meta.url);
const allowed = new Set(['sine', 'sawtooth', 'square', 'triangle', 'white', 'pink', 'brown', 'crackle']);
const forbidden = [/\bsamples\s*\(/, /\.bank\s*\(/, /\bgithub:/, /https?:\/\//, /\bsoundAlias\s*\(/, /\bregisterSound\s*\(/, /\.(?:sound|s)\s*\(\s*["'](?:bd|sd|hh|oh|cp|rim|tom|superpiano|gm_)/];
let bad = 0;

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.strudel'))) {
  const code = fs.readFileSync(new URL(file, dir), 'utf8').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  const problems = forbidden.filter((re) => re.test(code)).map((re) => `patrón prohibido ${re}`);
  for (const [, arg] of code.matchAll(/\b(?:s|sound)\(\s*["']([^"']*)["']\s*\)/g)) {
    for (const tok of arg.match(/[a-z_]+/gi) ?? []) if (!allowed.has(tok)) problems.push(`sonido no permitido: "${tok}"`);
  }
  console.log(`${problems.length ? '❌' : '✅'} ${file}${problems.length ? ' — ' + [...new Set(problems)].join('; ') : ' — solo sintetizadores incorporados'}`);
  bad += problems.length;
}
process.exitCode = bad ? 1 : 0;
