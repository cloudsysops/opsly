// Triage de clips: chequeo objetivo (duración/formato/palabras bloqueadas) + resumen
// legible por clip, para que el humano apruebe LEYENDO, no viendo cada video entero.
// SIEMPRE queda en "revisión manual" — este script nunca marca nada como "listo para
// publicar sin ver"; es lectura rápida, no un gate de auto-publicación.
//   node content-policy-check.mjs <carpetaClips> <manifest.json>
//
// manifest.json: { "<archivo.mp4>": { "hook": "...", "platform": "tiktok", "musicUsed": false } }
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { tenantConfig } from './tenant-config.mjs';

const [, , clipsDir, manifestPath] = process.argv;
if (!clipsDir || !manifestPath) {
  console.log('uso: content-policy-check.mjs <carpetaClips> <manifest.json>');
  process.exit(1);
}

const { contentPolicy = {} } = tenantConfig();
const blockedWords = (contentPolicy.blockedWords ?? []).map((w) => w.toLowerCase());
const maxDurationSec = contentPolicy.maxDurationSec ?? { tiktok: 60, shorts: 60, reels: 90, twitch: 60 };
const requiredAspect = contentPolicy.aspectRatio ?? '9:16';

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.width);
  return { durationSec: Math.round(Number(j.format.duration)), width: v?.width, height: v?.height };
}

const rows = [];
for (const [file, meta] of Object.entries(manifest)) {
  const full = path.join(clipsDir, file);
  if (!fs.existsSync(full)) { rows.push({ file, ok: false, reasons: ['archivo no encontrado'] }); continue; }
  const { durationSec, width, height } = probe(full);
  const reasons = [];

  const aspect = width && height ? `${width}:${height}` : 'desconocido';
  const isVertical = width && height && Math.abs(width / height - 9 / 16) < 0.02;
  if (requiredAspect === '9:16' && !isVertical) reasons.push(`formato no es 9:16 (es ${aspect})`);

  const limit = maxDurationSec[meta.platform] ?? maxDurationSec.tiktok;
  if (durationSec > limit) reasons.push(`dura ${durationSec}s, límite ${meta.platform ?? 'tiktok'} es ${limit}s`);

  const hookLower = (meta.hook ?? '').toLowerCase();
  const hitWords = blockedWords.filter((w) => hookLower.includes(w));
  if (hitWords.length) reasons.push(`palabra bloqueada en el título: "${hitWords.join(', ')}"`);

  if (meta.musicUsed === undefined) reasons.push('sin marcar si usa música (revisar manualmente)');
  else if (meta.musicUsed === true && !meta.musicCleared) reasons.push('usa música NO marcada como verificada/libre de licencia');

  rows.push({ file, durationSec, width, height, hook: meta.hook, platform: meta.platform, ok: reasons.length === 0, reasons });
}

console.log('# Resumen de clips — revisión manual (leer, no hace falta ver el video completo)\n');
for (const r of rows) {
  const flag = r.ok ? '✅ técnicamente en regla' : `⚠️  revisar: ${r.reasons.join(' · ')}`;
  console.log(`${r.file}`);
  console.log(`  gancho: "${r.hook ?? '?'}"  ·  ${r.durationSec ?? '?'}s  ·  ${r.width ?? '?'}x${r.height ?? '?'}  ·  destino: ${r.platform ?? '?'}`);
  console.log(`  ${flag}\n`);
}
const passing = rows.filter((r) => r.ok).length;
console.log(`${passing}/${rows.length} sin observaciones técnicas. TODOS siguen pendientes de tu aprobación para publicar — esto es solo el resumen de lectura.`);
