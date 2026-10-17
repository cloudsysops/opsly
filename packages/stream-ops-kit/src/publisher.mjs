// Publicador: toma la cola publish-queue.json (generada por post-stream-clips) y sube a las redes SOLO lo aprobado
// y vencido, con tope diario, interruptor de apagado y reintentos acotados. NO sabe subir videos por si mismo:
// recibe adaptadores (p. ej. el YouTubePublisher existente, via opsafterdark-adapters.mjs con --adapters).
//
//   node publisher.mjs --queue <publish-queue.json> --adapters <modulo>     (una pasada; pensado para Task Scheduler)
//   node publisher.mjs --queue <...> status                                  (lista la cola)
//   node publisher.mjs --queue <...> approve <id> | approve --all            (aprueba borradores)
//   opciones: --dry (no sube nada) · --auto-approve (aprueba solos los borradores que pasen los chequeos) · --no-obs-check
//
// Seguridad: sin adaptador o sin credenciales no publica nada. Se detiene si existe <carpeta de la cola>/PUBLISH_DISABLED
// o OAD_PUBLISH_DISABLED=1. No corre con OBS en directo ni con OBS abierto sin websocket (salvo --no-obs-check).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readJson, obsState } from './post-stream-clips.mjs';
import { redact, toLocalPath, zonedToEpoch } from './publisher-util.mjs';

export const PUBLISH_DEFAULTS = { dailyCap: 1, maxAttempts: 3, autoApprove: false };

const dayParts = (ms, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric' })
  .formatToParts(ms).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
export const dayKey = (ms, tz) => { const d = dayParts(ms, tz); return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`; };

export const dueAt = (entry) => zonedToEpoch(entry.scheduledAt, entry.timezone);
export const isDue = (entry, nowMs) => dueAt(entry) <= nowMs;

export function publishedToday(queue, nowMs, tz) {
  const today = dayKey(nowMs, tz);
  return queue.filter((e) => e.publishedAt && dayKey(Date.parse(e.publishedAt), tz) === today).length;
}

// Motivos por los que un borrador NO se puede aprobar solo.
export function autoApproveBlockers(entry, { exists = (p) => fs.existsSync(toLocalPath(p)) } = {}) {
  const why = [];
  if (!entry.vertical) why.push('sin video vertical');
  else if (!exists(entry.vertical)) why.push('el archivo vertical no existe');
  if ((entry.warnings ?? []).some((w) => /^NO_VERTICAL/.test(w))) why.push('NO_VERTICAL');
  if (!entry.platforms?.length) why.push('sin plataformas');
  return why;
}

export function approveEntries(queue, ids, { nowIso = new Date().toISOString(), by = 'operator' } = {}) {
  const all = ids === 'all';
  let n = 0;
  for (const e of queue) {
    if ((all || ids.includes(e.id)) && e.status === 'draft') { e.status = 'approved'; e.approvedAt = nowIso; e.approvedBy = by; n++; }
  }
  return n;
}

// Siguiente entrada a publicar: aprobada (o autoaprobable), vencida y con intentos restantes. Primero las parciales.
export function selectNext(queue, { nowMs, policy = PUBLISH_DEFAULTS, exists } = {}) {
  const eligible = queue.filter((e) => {
    if (!isDue(e, nowMs)) return false;
    if ((e.attempts ?? 0) >= policy.maxAttempts) return false;
    if (e.status === 'approved' || e.status === 'partial') return true;
    return policy.autoApprove && e.status === 'draft' && autoApproveBlockers(e, { exists }).length === 0;
  });
  eligible.sort((a, b) => (a.status === 'partial' ? -1 : 0) - (b.status === 'partial' ? -1 : 0) || dueAt(a) - dueAt(b));
  return eligible[0] ?? null;
}

function writeQueue(file, queue) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(queue, null, 2));
  fs.renameSync(tmp, file);
}

export async function runPublisher({ queueFile, adapters = {}, nowMs = Date.now(), policy = PUBLISH_DEFAULTS, dry = false, killSwitch = false, exists, log = () => {} }) {
  if (killSwitch) { log('Publicacion desactivada (interruptor de apagado).'); return { action: 'disabled' }; }
  const queue = readJson(queueFile, []);
  if (!queue.length) { log('La cola esta vacia.'); return { action: 'empty' }; }

  const tz = queue[0].timezone ?? 'America/New_York';
  if (publishedToday(queue, nowMs, tz) >= policy.dailyCap && !queue.some((e) => e.status === 'partial' && isDue(e, nowMs))) {
    log(`Tope diario alcanzado (${policy.dailyCap}).`); return { action: 'cap-reached' };
  }
  const entry = selectNext(queue, { nowMs, policy, exists });
  if (!entry) { log('Nada aprobado y vencido que publicar.'); return { action: 'nothing-due' }; }

  if (entry.status === 'draft') { entry.status = 'approved'; entry.approvedAt = new Date(nowMs).toISOString(); entry.approvedBy = 'auto-approve'; log(`${entry.id}: autoaprobado (paso los chequeos).`); }
  entry.platformStatus ??= {};
  const results = {};
  let anyAttempt = false;
  const at = () => new Date(nowMs).toISOString();

  for (const platform of entry.platforms ?? []) {
    const cur = entry.platformStatus[platform];
    if (cur && ['published', 'skipped'].includes(cur.state)) { results[platform] = cur.state; continue; }
    const adapter = adapters[platform];
    if (!adapter) { entry.platformStatus[platform] = { state: 'skipped', reason: 'sin adaptador', at: at() }; results[platform] = 'skipped'; log(`${entry.id} · ${platform}: sin adaptador, se omite.`); continue; }
    const ready = adapter.ready();
    if (ready.notImplemented) { entry.platformStatus[platform] = { state: 'skipped', reason: 'no implementado', at: at() }; results[platform] = 'skipped'; continue; }
    if (!ready.ok) { entry.platformStatus[platform] = { state: 'missing-credentials', missing: ready.missing, at: at() }; results[platform] = 'missing-credentials'; log(`${entry.id} · ${platform}: faltan credenciales (${ready.missing.join(', ')}).`); continue; }
    if (dry) { log(`[dry] ${entry.id} · ${platform}: subiria ${entry.vertical}`); results[platform] = 'dry'; continue; }
    anyAttempt = true;
    try {
      const r = await adapter.publish(entry);
      entry.platformStatus[platform] = { state: 'published', id: r.id, url: r.url ?? null, note: r.note ?? null, privacy: r.privacy ?? null, at: new Date(nowMs).toISOString() };
      results[platform] = 'published';
      log(`${entry.id} · ${platform}: publicado ${r.url ?? r.id}.`);
    } catch (err) {
      entry.platformStatus[platform] = { state: 'error', error: redact(err.message), at: new Date(nowMs).toISOString() };
      results[platform] = 'error';
      log(`${entry.id} · ${platform}: ERROR ${redact(err.message)}`);
    }
    writeQueue(queueFile, queue); // persistir cada plataforma: un fallo posterior no debe perder lo ya subido
  }

  if (dry) return { action: 'dry', id: entry.id, results };
  if (anyAttempt) entry.attempts = (entry.attempts ?? 0) + 1;
  const states = (entry.platforms ?? []).map((p) => entry.platformStatus[p]?.state);
  if (states.every((s) => s === 'published' || s === 'skipped') && states.includes('published')) { entry.status = 'published'; entry.publishedAt = new Date(nowMs).toISOString(); }
  else if (states.includes('published') || states.includes('error')) entry.status = (entry.attempts ?? 0) >= policy.maxAttempts ? 'failed' : 'partial';
  writeQueue(queueFile, queue);
  return { action: 'ran', id: entry.id, status: entry.status, results };
}

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

async function loadAdapters(modulePath) {
  if (!modulePath) return {};
  const mod = await import(pathToFileURL(path.resolve(modulePath)).href);
  return mod.default ?? mod.adapters ?? {};
}

export async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const has = (n) => argv.includes(n);
  const queueFile = arg('--queue');
  if (!queueFile) { console.error('uso: --queue <publish-queue.json> [--adapters <modulo>] [status | approve <id>|--all] [--dry] [--auto-approve] [--no-obs-check]'); return 2; }
  const log = (m) => console.log(`[${stamp()}] ${m}`);
  const valueFlags = new Set(['--queue', '--adapters']);
  const cmd = argv.find((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]));

  if (cmd === 'status') {
    for (const e of readJson(queueFile, [])) console.log(`${e.id}  ${e.scheduledAt}  ${e.status}  ${(e.platforms ?? []).map((p) => `${p}:${e.platformStatus?.[p]?.state ?? '-'}`).join(' ')}`);
    return 0;
  }
  if (cmd === 'approve') {
    const queue = readJson(queueFile, []);
    const ids = has('--all') ? 'all' : argv.slice(argv.indexOf('approve') + 1).filter((a) => !a.startsWith('--'));
    const n = approveEntries(queue, ids);
    writeQueue(queueFile, queue);
    log(`${n} entrada(s) aprobada(s).`);
    return 0;
  }

  const killSwitch = process.env.OAD_PUBLISH_DISABLED === '1' || fs.existsSync(path.join(path.dirname(queueFile), 'PUBLISH_DISABLED'));
  if (!has('--no-obs-check') && !killSwitch) {
    const st = await obsState();
    if (st === 'live') { log('OBS esta en directo: no se publica ahora.'); return 0; }
    if (st === 'unknown') { log('OBS abierto sin websocket: no se sabe si hay directo, no se publica.'); return 0; }
  }
  const adapters = await loadAdapters(arg('--adapters'));
  const res = await runPublisher({ queueFile, adapters, killSwitch, dry: has('--dry'), policy: { ...PUBLISH_DEFAULTS, autoApprove: has('--auto-approve') }, log });
  return res.action === 'ran' && res.status === 'failed' ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((c) => process.exit(c), (e) => { console.error(redact(e.message)); process.exit(1); });
}
