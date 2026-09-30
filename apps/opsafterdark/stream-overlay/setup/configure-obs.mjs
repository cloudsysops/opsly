import crypto from 'node:crypto';
import fs from 'node:fs';

const configPath = 'C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const sceneName = 'Battlefield 6 — Día 2';
const sourceName = 'Overlay PC — Live';
const websocket = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
let requestId = 0;
const pending = new Map();

function auth(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}

function request(requestType, requestData = {}) {
  const id = String(++requestId);
  websocket.send(JSON.stringify({ op: 6, d: { requestType, requestId: id, requestData } }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

websocket.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const authentication = message.d.authentication;
    websocket.send(JSON.stringify({
      op: 1,
      d: {
        rpcVersion: 1,
        ...(authentication ? { authentication: auth(config.server_password, authentication.salt, authentication.challenge) } : {}),
      },
    }));
    return;
  }
  if (message.op === 7) {
    const pendingRequest = pending.get(message.d.requestId);
    pending.delete(message.d.requestId);
    if (!pendingRequest) return;
    if (message.d.requestStatus.result) pendingRequest.resolve(message.d.responseData ?? {});
    else pendingRequest.reject(new Error(message.d.requestStatus.comment || message.d.requestStatus.code));
    return;
  }
  if (message.op !== 2) return;
  try {
    try {
      await request('GetInputSettings', { inputName: sourceName });
      await request('SetInputSettings', {
        inputName: sourceName,
        inputSettings: { url: 'http://127.0.0.1:8765/', width: 500, height: 320, shutdown: true, restart_when_active: true, refreshnocache: true },
        overlay: true,
      });
    } catch {
      await request('CreateInput', {
        sceneName,
        inputName: sourceName,
        inputKind: 'browser_source',
        inputSettings: { url: 'http://127.0.0.1:8765/', width: 500, height: 320, shutdown: true, restart_when_active: true, refreshnocache: true },
        sceneItemEnabled: true,
      });
    }
    await request('PressInputPropertiesButton', { inputName: sourceName, propertyName: 'refreshnocache' });
    const item = await request('GetSceneItemId', { sceneName, sourceName });
    await request('SetSceneItemTransform', {
      sceneName,
      sceneItemId: item.sceneItemId,
      sceneItemTransform: { positionX: 1880, positionY: 930 },
    });
    await request('SetSceneItemEnabled', { sceneName, sceneItemId: item.sceneItemId, sceneItemEnabled: true });
    try {
      const desktop = await request('GetSceneItemId', { sceneName, sourceName: 'Display Capture' });
      await request('SetSceneItemEnabled', { sceneName, sceneItemId: desktop.sceneItemId, sceneItemEnabled: false });
    } catch {}
    console.log(JSON.stringify({ configured: true, scene: sceneName, source: sourceName }));
  } catch (error) {
    console.log(JSON.stringify({ configured: false, reason: String(error.message || error).replace(/[A-Za-z0-9]/g, 'x').slice(0, 80) }));
    process.exitCode = 1;
  } finally {
    websocket.close();
  }
};

websocket.onerror = () => {
  console.log(JSON.stringify({ configured: false, reason: 'websocket-connection-failed' }));
  process.exitCode = 1;
};
