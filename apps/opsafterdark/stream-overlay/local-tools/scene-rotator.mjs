import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const gameScene = 'Battlefield 6 — Día 2';
const safeScene = 'Vuelvo en un momento';
const managedScenes = new Set([gameScene, safeScene]);
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
let requestNumber = 0;
const pending = new Map();
let lastTarget = null;

function authentication(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}
function request(requestType, requestData = {}) {
  const requestId = String(++requestNumber);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
function battlefieldRunning() {
  return new Promise((resolve) => execFile('tasklist', ['/FI', 'IMAGENAME eq bf6.exe', '/NH'], { windowsHide: true }, (_error, stdout) => resolve(/bf6\.exe/i.test(stdout))));
}
async function rotate() {
  const gameRunning = await battlefieldRunning();
  const target = gameRunning ? gameScene : safeScene;
  const current = await request('GetCurrentProgramScene');
  if (!managedScenes.has(current.currentProgramSceneName)) return;
  if (current.currentProgramSceneName !== target) {
    await request('SetCurrentProgramScene', { sceneName: target });
    console.log(JSON.stringify({ changed: true, target, reason: gameRunning ? 'battlefield-running' : 'battlefield-not-running' }));
  }
  lastTarget = target;
}

ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const auth = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authentication(config.server_password, auth.salt, auth.challenge) } }));
  } else if (message.op === 7) {
    const waiter = pending.get(message.d.requestId);
    pending.delete(message.d.requestId);
    if (!waiter) return;
    message.d.requestStatus.result ? waiter.resolve(message.d.responseData ?? {}) : waiter.reject(new Error(message.d.requestStatus.comment || message.d.requestStatus.code));
  } else if (message.op === 2) {
    rotate().catch(() => undefined);
    setInterval(() => rotate().catch(() => undefined), 5000).unref();
    console.log(JSON.stringify({ started: true, policy: 'battlefield-to-game-or-brb-only' }));
  }
};
ws.onerror = () => console.log(JSON.stringify({ started: false, reason: 'obs-websocket-unavailable' }));
