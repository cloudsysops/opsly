import { readObsWebsocketConfig, authenticate } from './obs-connection.mjs';

const config = readObsWebsocketConfig();
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
const pending = new Map();
let sequence = 0;
function request(requestType, requestData = {}) {
  const requestId = String(++sequence);
  ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
ws.onmessage = async ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const login = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authenticate(config.server_password, login.salt, login.challenge) } }));
  } else if (message.op === 7) {
    const waiter = pending.get(message.d.requestId);
    pending.delete(message.d.requestId);
    if (!waiter) return;
    message.d.requestStatus.result ? waiter.resolve(message.d.responseData ?? {}) : waiter.reject(new Error('request-failed'));
  } else if (message.op === 2) {
    const current = await request('GetCurrentProgramScene');
    const stream = await request('GetStreamStatus');
    console.log(JSON.stringify({ scene: current.currentProgramSceneName, streaming: stream.outputActive }));
    ws.close();
  }
};
