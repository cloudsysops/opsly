// Vigila si el proceso del juego del tenant (stream.config.json → game.processName) está
// corriendo y alterna entre la escena de juego y la escena "segura" (brb) en consecuencia.
// Solo actúa si la escena actual ya es una de las dos gestionadas; nunca toca otra escena.
import { execFile } from 'node:child_process';
import { readObsWebsocketConfig, authenticate } from './obs-connection.mjs';
import { tenantConfig } from './tenant-config.mjs';

const config = readObsWebsocketConfig();
const { obsSceneNames = {}, game } = tenantConfig();
if (!game?.processName) throw new Error('stream.config.json no define "game.processName" (ej: "bf6.exe").');
const gameScene = obsSceneNames.juego;
const safeScene = obsSceneNames.brb;
if (!gameScene || !safeScene) throw new Error('stream.config.json debe definir obsSceneNames.juego y obsSceneNames.brb.');
const managedScenes = new Set([gameScene, safeScene]);
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
let requestNumber = 0;
const pending = new Map();
let lastTarget = null;

function request(requestType, requestData = {}) {
  const requestId = String(++requestNumber);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
function gameRunningCheck() {
  return new Promise((resolve) => execFile('tasklist', ['/FI', `IMAGENAME eq ${game.processName}`, '/NH'], { windowsHide: true }, (_error, stdout) => resolve(new RegExp(game.processName.replace('.', '\\.'), 'i').test(stdout))));
}
async function rotate() {
  const gameRunning = await gameRunningCheck();
  const target = gameRunning ? gameScene : safeScene;
  const current = await request('GetCurrentProgramScene');
  if (!managedScenes.has(current.currentProgramSceneName)) return;
  if (current.currentProgramSceneName !== target) {
    await request('SetCurrentProgramScene', { sceneName: target });
    console.log(JSON.stringify({ changed: true, target, reason: gameRunning ? 'game-running' : 'game-not-running' }));
  }
  lastTarget = target;
}

ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const auth = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authenticate(config.server_password, auth.salt, auth.challenge) } }));
  } else if (message.op === 7) {
    const waiter = pending.get(message.d.requestId);
    pending.delete(message.d.requestId);
    if (!waiter) return;
    message.d.requestStatus.result ? waiter.resolve(message.d.responseData ?? {}) : waiter.reject(new Error(message.d.requestStatus.comment || message.d.requestStatus.code));
  } else if (message.op === 2) {
    rotate().catch(() => undefined);
    setInterval(() => rotate().catch(() => undefined), 5000).unref();
    console.log(JSON.stringify({ started: true, policy: 'game-to-scene-or-brb-only' }));
  }
};
ws.onerror = () => console.log(JSON.stringify({ started: false, reason: 'obs-websocket-unavailable' }));
