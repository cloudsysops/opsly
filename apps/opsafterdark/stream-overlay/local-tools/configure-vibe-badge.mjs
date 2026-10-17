import crypto from 'node:crypto';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const sceneName = 'Battlefield 6 — Día 2';
const sourceName = 'Vibe Coding — Live';
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
let sequence = 0;
const pending = new Map();

function auth(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}
function request(requestType, requestData = {}) {
  const requestId = String(++sequence);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const login = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: auth(config.server_password, login.salt, login.challenge) } }));
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
    const inputSettings = { url: 'http://127.0.0.1:8765/vibe', width: 500, height: 80, shutdown: true, restart_when_active: true, refreshnocache: true };
    try {
      await request('GetInputSettings', { inputName: sourceName });
      await request('SetInputSettings', { inputName: sourceName, inputSettings, overlay: true });
    } catch {
      await request('CreateInput', { sceneName, inputName: sourceName, inputKind: 'browser_source', inputSettings, sceneItemEnabled: true });
    }
    await request('PressInputPropertiesButton', { inputName: sourceName, propertyName: 'refreshnocache' });
    const item = await request('GetSceneItemId', { sceneName, sourceName });
    await request('SetSceneItemTransform', { sceneName, sceneItemId: item.sceneItemId, sceneItemTransform: { positionX: 1880, positionY: 840 } });
    await request('SetSceneItemEnabled', { sceneName, sceneItemId: item.sceneItemId, sceneItemEnabled: true });
    console.log(JSON.stringify({ configured: true, scene: sceneName, source: sourceName }));
  } catch (error) {
    console.log(JSON.stringify({ configured: false, reason: String(error.message || error).replace(/[A-Za-z0-9]/g, 'x').slice(0, 80) }));
    process.exitCode = 1;
  } finally { ws.close(); }
};
ws.onerror = () => { console.log(JSON.stringify({ configured: false, reason: 'websocket-connection-failed' })); process.exitCode = 1; };
