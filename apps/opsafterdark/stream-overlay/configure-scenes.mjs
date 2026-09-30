import crypto from 'node:crypto';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
const pending = new Map();
let sequence = 0;
const base = 'http://127.0.0.1:8765';
const browser = (path, width, height) => ({ url: `${base}${path}`, width, height, shutdown: true, restart_when_active: true, refreshnocache: true });

// Pantallas completas: una fuente animada reemplaza fondo + texto estáticos.
const fullscreen = [
  { scene: 'Iniciando Stream', source: 'Pantalla Inicio', path: '/starting', hide: ['Fondo Inicio', 'Texto Inicio'] },
  { scene: 'Vuelvo en un momento', source: 'Pantalla BRB', path: '/brb', hide: ['Fondo BRB', 'Texto BRB'] },
  { scene: 'Terminando Stream', source: 'Pantalla Fin', path: '/ending', hide: ['Fondo Fin', 'Texto Fin'] },
];
// Escenas de juego/código: un solo HUD (reloj + marca) reemplaza Reloj y Marca.
const hudScenes = ['Gaming', 'Coding', 'Battlefield 6 — Día 2'];

function auth(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}
function request(requestType, requestData = {}) {
  const requestId = String(++sequence);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
async function upsert(scene, source, settings) {
  try {
    await request('GetInputSettings', { inputName: source });
    await request('SetInputSettings', { inputName: source, inputSettings: settings, overlay: true });
    try { await request('GetSceneItemId', { sceneName: scene, sourceName: source }); }
    catch { await request('CreateSceneItem', { sceneName: scene, sourceName: source }); }
  } catch {
    await request('CreateInput', { sceneName: scene, inputName: source, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true });
  }
  await request('PressInputPropertiesButton', { inputName: source, propertyName: 'refreshnocache' });
  return (await request('GetSceneItemId', { sceneName: scene, sourceName: source })).sceneItemId;
}
async function setEnabled(scene, source, enabled) {
  try {
    const item = await request('GetSceneItemId', { sceneName: scene, sourceName: source });
    await request('SetSceneItemEnabled', { sceneName: scene, sceneItemId: item.sceneItemId, sceneItemEnabled: enabled });
  } catch {}
}

ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const login = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, ...(login ? { authentication: auth(config.server_password, login.salt, login.challenge) } : {}) } }));
    return;
  }
  if (message.op === 7) {
    const waiter = pending.get(message.d.requestId);
    pending.delete(message.d.requestId);
    if (!waiter) return;
    message.d.requestStatus.result ? waiter.resolve(message.d.responseData ?? {}) : waiter.reject(new Error(message.d.requestStatus.comment || message.d.requestStatus.code));
    return;
  }
  if (message.op !== 2) return;
  try {
    const stream = await request('GetStreamStatus');
    if (stream.outputActive) throw new Error('stream-live-refusing-to-edit');
    for (const { scene, source, path, hide } of fullscreen) {
      const id = await upsert(scene, source, browser(path, 2560, 1440));
      await request('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } });
      await request('SetSceneItemIndex', { sceneName: scene, sceneItemId: id, sceneItemIndex: 0 });
      await request('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
      for (const old of hide) await setEnabled(scene, old, false);
    }
    for (const scene of hudScenes) {
      const id = await upsert(scene, 'HUD OpsAfterDark', browser('/hud', 460, 90));
      await request('SetSceneItemTransform', { sceneName: scene, sceneItemId: id, sceneItemTransform: { positionX: 30, positionY: 20, scaleX: 1, scaleY: 1 } });
      await request('SetSceneItemEnabled', { sceneName: scene, sceneItemId: id, sceneItemEnabled: true });
      await setEnabled(scene, 'Reloj', false);
      await setEnabled(scene, 'Marca OpsAfterDark', false);
    }
    // Coding: la tarjeta derecha pasa a ser el resumen de sesión (Claude + Codex).
    await request('SetInputSettings', { inputName: 'Vibe Coding Glass', inputSettings: browser('/summary', 1200, 700), overlay: true });
    await request('PressInputPropertiesButton', { inputName: 'Vibe Coding Glass', propertyName: 'refreshnocache' });
    console.log(JSON.stringify({ configured: true }));
  } catch (error) {
    console.log(JSON.stringify({ configured: false, reason: String(error.message || error).slice(0, 80) }));
    process.exitCode = 1;
  } finally { ws.close(); }
};
ws.onerror = () => { console.log(JSON.stringify({ configured: false, reason: 'websocket-connection-failed' })); process.exitCode = 1; };
