// Alertas REALES de Twitch (follow/sub/raid) vía EventSub WebSocket — no necesita
// servidor público ni webhook: este proceso abre el WebSocket, Twitch empuja eventos.
// Al recibir uno, lo manda al overlay local (POST /alerts/push) para que se vea en pantalla.
//   node twitch-eventsub.mjs
import { tenantConfig } from './tenant-config.mjs';
import { tool, api } from './obs.mjs';

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
if (!CLIENT_ID || !ACCESS_TOKEN) {
  console.error('Faltan TWITCH_CLIENT_ID / TWITCH_ACCESS_TOKEN en el entorno (Doppler/.env). Este script nunca los pide ni los guarda.');
  process.exit(1);
}

const { twitch } = tenantConfig();
const channel = twitch?.channel;
if (!channel) throw new Error('stream.config.json no define "twitch.channel".');
// Nombre del tipo de evento de Twitch -> tipo interno que ya entiende el overlay (obs.mjs alertTypes).
const WANTED = new Set(twitch?.eventSubTypes ?? ['follow', 'subscribe', 'raid']);
const EVENT_TO_ALERT = { 'channel.follow': 'follow', 'channel.subscribe': 'sub', 'channel.raid': 'raid' };

async function helix(path, init = {}) {
  const res = await fetch(`https://api.twitch.tv/helix${path}`, {
    ...init,
    headers: { 'Client-Id': CLIENT_ID, Authorization: `Bearer ${ACCESS_TOKEN}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Twitch API ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function getBroadcasterId() {
  const { data } = await helix(`/users?login=${encodeURIComponent(channel)}`);
  if (!data?.[0]) throw new Error(`No se encontró el canal "${channel}" en Twitch.`);
  return data[0].id;
}

async function subscribe(type, sessionId, broadcasterId) {
  const condition = { broadcaster_user_id: broadcasterId };
  const version = { 'channel.follow': '2', 'channel.subscribe': '1', 'channel.raid': '1' }[type];
  if (type === 'channel.follow') condition.moderator_user_id = broadcasterId; // el canal se lee a sí mismo como moderador
  if (type === 'channel.raid') condition.to_broadcaster_user_id = broadcasterId;
  await helix('/eventsub/subscriptions', {
    method: 'POST',
    body: JSON.stringify({ type, version, condition, transport: { method: 'websocket', session_id: sessionId } }),
  });
  console.log(`suscrito: ${type}`);
}

const broadcasterId = await getBroadcasterId();
const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

ws.onmessage = async ({ data }) => {
  const msg = JSON.parse(data);
  const type = msg.metadata?.message_type;
  if (type === 'session_welcome') {
    const sessionId = msg.payload.session.id;
    console.log(JSON.stringify({ connected: true, sessionId, channel }));
    for (const t of ['channel.follow', 'channel.subscribe', 'channel.raid']) {
      const short = EVENT_TO_ALERT[t];
      if (WANTED.has(short) || WANTED.has(t)) await subscribe(t, sessionId, broadcasterId).catch((e) => console.error(`no se pudo suscribir a ${t}:`, e.message));
    }
  } else if (type === 'notification') {
    const evType = msg.metadata.subscription_type;
    const alertType = EVENT_TO_ALERT[evType];
    if (!alertType) return;
    const ev = msg.payload.event;
    const name = ev.user_name || ev.from_broadcaster_user_name || 'alguien';
    const params = new URLSearchParams({ type: alertType, name });
    if (alertType === 'raid') params.set('viewers', String(ev.viewers ?? 0));
    if (alertType === 'sub') params.set('months', String(ev.cumulative_months ?? ev.duration_months ?? 1));
    await tool(`/alerts/push?${params.toString()}`);
    console.log(JSON.stringify({ event: evType, name }));
  } else if (type === 'session_keepalive') {
    // nada que hacer, solo confirma que la conexión sigue viva
  } else if (type === 'session_reconnect') {
    console.log('Twitch pidió reconexión; reinicia este script.');
    process.exit(0);
  }
};
ws.onerror = () => console.error(JSON.stringify({ connected: false, reason: 'eventsub-websocket-unavailable' }));
console.log(`Conectando a EventSub para "${channel}" (overlay en ${api})...`);
