// Rastrea los VODs de Twitch y avisa cuando están por vencer. NUNCA borra nada
// automáticamente: "delete" exige --yes explícito, cada vez, para ese id puntual.
//   node vod-policy.mjs archive        registra los VODs recientes en vod-tracker.json
//   node vod-policy.mjs check          reporta VODs que vencen en ≤3 días (no borra nada)
//   node vod-policy.mjs delete <id> --yes   borra UN VOD puntual, confirmación explícita
import fs from 'node:fs';
import { tenantPath } from './tenant-paths.mjs';
import { tenantConfig } from './tenant-config.mjs';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
if (!CLIENT_ID || !ACCESS_TOKEN) {
  console.error('Faltan TWITCH_CLIENT_ID / TWITCH_ACCESS_TOKEN en el entorno (Doppler/.env). Este script nunca los pide ni los guarda.');
  process.exit(1);
}

const { twitch } = tenantConfig();
const channel = twitch?.channel;
if (!channel) throw new Error('stream.config.json no define "twitch.channel".');
const retentionDays = twitch?.vodRetentionDays ?? 15;

async function helix(path, init = {}) {
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    ...init,
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${ACCESS_TOKEN}`, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Twitch API ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

function loadTracker() {
  try { return JSON.parse(fs.readFileSync(tenantPath('vod-tracker.json'), 'utf8')); }
  catch { return { vods: [] }; }
}
function saveTracker(data) {
  fs.writeFileSync(tenantPath('vod-tracker.json'), JSON.stringify(data, null, 2));
}

async function getBroadcasterId() {
  const { data } = await helix(`/users?login=${encodeURIComponent(channel)}`);
  if (!data?.[0]) throw new Error(`No se encontró el canal "${channel}" en Twitch.`);
  return data[0].id;
}

const cmd = process.argv[2];

if (cmd === 'archive') {
  const broadcasterId = await getBroadcasterId();
  const { data } = await helix(`/videos?user_id=${broadcasterId}&type=archive&first=5`);
  const tracker = loadTracker();
  let added = 0;
  for (const v of data ?? []) {
    if (tracker.vods.some((t) => t.id === v.id)) continue;
    const createdAt = new Date(v.created_at);
    const expiresAt = new Date(createdAt.getTime() + retentionDays * 86400000);
    tracker.vods.push({ id: v.id, title: v.title, createdAt: v.created_at, expiresAt: expiresAt.toISOString(), duration: v.duration, url: v.url, deleted: false });
    added += 1;
  }
  saveTracker(tracker);
  console.log(JSON.stringify({ tracked: tracker.vods.length, newlyAdded: added }));

} else if (cmd === 'check') {
  const tracker = loadTracker();
  const now = Date.now();
  const soon = tracker.vods.filter((v) => !v.deleted && new Date(v.expiresAt).getTime() - now <= 3 * 86400000);
  for (const v of soon) {
    const daysLeft = Math.ceil((new Date(v.expiresAt).getTime() - now) / 86400000);
    console.log(`⚠️  "${v.title}" (${v.id}) — vence en ${daysLeft}d (${v.expiresAt}) — ${v.url}`);
  }
  if (!soon.length) console.log('Nada por vencer en los próximos 3 días.');
  console.log(JSON.stringify({ expiringSoon: soon.map((v) => v.id) }));

} else if (cmd === 'delete') {
  const id = process.argv[3];
  const confirmed = process.argv.includes('--yes');
  if (!id) { console.log('uso: vod-policy.mjs delete <id> --yes'); process.exit(1); }
  if (!confirmed) { console.log('Falta --yes. Este comando borra el VOD de Twitch de forma PERMANENTE. Confírmalo explícitamente cada vez.'); process.exit(1); }
  await helix(`/videos?id=${id}`, { method: 'DELETE' });
  const tracker = loadTracker();
  const entry = tracker.vods.find((v) => v.id === id);
  if (entry) entry.deleted = true;
  saveTracker(tracker);
  console.log(JSON.stringify({ deleted: id }));

} else {
  console.log('uso: vod-policy.mjs archive | check | delete <id> --yes');
  process.exit(1);
}
