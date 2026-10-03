import crypto from 'node:crypto';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const sceneName = 'Coding';
const sourceName = 'Vibe Coding Glass';
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
let sequence = 0;
const pending = new Map();

const authentication = (password, salt, challenge) => {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
};

function request(requestType, requestData = {}) {
  const requestId = String(++sequence);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}

ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const auth = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authentication(config.server_password, auth.salt, auth.challenge) } }));
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
    const settings = { url: 'http://127.0.0.1:8765/coding', width: 2560, height: 1440, shutdown: true, restart_when_active: true, refreshnocache: true };
    try {
      await request('GetInputSettings', { inputName: sourceName });
      await request('SetInputSettings', { inputName: sourceName, inputSettings: settings, overlay: true });
    } catch {
      await request('CreateInput', { sceneName, inputName: sourceName, inputKind: 'browser_source', inputSettings: settings, sceneItemEnabled: true });
    }
    await request('PressInputPropertiesButton', { inputName: sourceName, propertyName: 'refreshnocache' });
    const glass = await request('GetSceneItemId', { sceneName, sourceName });
    const terminal = await request('GetSceneItemId', { sceneName, sourceName: 'Window Capture' });
    await request('SetSceneItemTransform', { sceneName, sceneItemId: glass.sceneItemId, sceneItemTransform: { positionX: 0, positionY: 0, scaleX: 1, scaleY: 1 } });
    await request('SetSceneItemIndex', { sceneName, sceneItemId: glass.sceneItemId, sceneItemIndex: 4 });
    await request('SetSceneItemTransform', { sceneName, sceneItemId: terminal.sceneItemId, sceneItemTransform: { positionX: 0, positionY: 0, boundsType: 'OBS_BOUNDS_SCALE_INNER', boundsWidth: 1280, boundsHeight: 1440 } });
    await request('SetSceneItemEnabled', { sceneName, sceneItemId: glass.sceneItemId, sceneItemEnabled: true });
    await request('SetSceneItemEnabled', { sceneName, sceneItemId: terminal.sceneItemId, sceneItemEnabled: true });
    try {
      const desktop = await request('GetSceneItemId', { sceneName, sourceName: 'Display Capture' });
      await request('SetSceneItemEnabled', { sceneName, sceneItemId: desktop.sceneItemId, sceneItemEnabled: false });
    } catch {}
    console.log(JSON.stringify({ configured: true, scene: sceneName }));
  } catch (error) {
    console.log(JSON.stringify({ configured: false, reason: String(error.message || error).replace(/[A-Za-z0-9]/g, 'x').slice(0, 80) }));
    process.exitCode = 1;
  } finally { ws.close(); }
};

ws.onerror = () => { console.log(JSON.stringify({ configured: false, reason: 'websocket-connection-failed' })); process.exitCode = 1; };
