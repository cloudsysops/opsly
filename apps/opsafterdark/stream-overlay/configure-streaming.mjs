import crypto from 'node:crypto';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
const pending = new Map();
let sequence = 0;
const sceneName = 'Streaming';
const sourceName = 'Overlay Streaming';
const settings = { url: 'http://127.0.0.1:8765/stream', width: 2560, height: 1440, shutdown: true, restart_when_active: true, refreshnocache: true };

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
    if ((await request('GetStreamStatus')).outputActive) throw new Error('stream-live-refusing-to-edit');
    try {
      await request('GetInputSettings', { inputName: sourceName });
      await request('SetInputSettings', { inputName: sourceName, inputSettings: settings, overlay: true });
    } catch {
      await request('CreateInput', { sceneName, inputName: sourceName, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true });
    }
    await request('PressInputPropertiesButton', { inputName: sourceName, propertyName: 'refreshnocache' });
    const overlay = (await request('GetSceneItemId', { sceneName, sourceName })).sceneItemId;
    const dj = (await request('GetSceneItemId', { sceneName, sourceName: 'DJ NDI (Mac)' })).sceneItemId;
    await request('SetSceneItemTransform', { sceneName, sceneItemId: overlay, sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } });
    // El video del DJ entra en el hueco del marco (640x360), sin importar su resolución.
    await request('SetSceneItemTransform', { sceneName, sceneItemId: dj, sceneItemTransform: { alignment: 5, positionX: 1820, positionY: 860, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsAlignment: 0, boundsWidth: 640, boundsHeight: 360 } });
    await request('SetSceneItemIndex', { sceneName, sceneItemId: dj, sceneItemIndex: 1 });
    await request('SetSceneItemIndex', { sceneName, sceneItemId: overlay, sceneItemIndex: 2 });
    await request('SetSceneItemEnabled', { sceneName, sceneItemId: overlay, sceneItemEnabled: true });
    console.log(JSON.stringify({ configured: true, scene: sceneName }));
  } catch (error) {
    console.log(JSON.stringify({ configured: false, reason: String(error.message || error).slice(0, 80) }));
    process.exitCode = 1;
  } finally { ws.close(); }
};
ws.onerror = () => { console.log(JSON.stringify({ configured: false, reason: 'websocket-connection-failed' })); process.exitCode = 1; };
