import crypto from 'node:crypto';
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));

// Conecta a OBS, corre fn(request) y cierra. Rechaza si OBS no responde en 5 s.
export function withObs(fn, timeoutMs = 5000, { eventSubscriptions, onEvent } = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);
    const pending = new Map();
    let sequence = 0;
    const timer = setTimeout(() => { reject(new Error('obs-websocket-timeout')); ws.close(); }, timeoutMs);
    const request = (requestType, requestData = {}) => {
      const requestId = String(++sequence);
      ws.send(JSON.stringify({ op: 6, d: { requestType, requestId, requestData } }));
      return new Promise((res, rej) => pending.set(requestId, { res, rej }));
    };
    ws.onmessage = async ({ data }) => {
      const m = JSON.parse(data);
      if (m.op === 0) {
        const a = m.d.authentication;
        const proof = a && (() => {
          const secret = crypto.createHash('sha256').update(config.server_password + a.salt).digest('base64');
          return crypto.createHash('sha256').update(secret + a.challenge).digest('base64');
        })();
        ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, ...(a ? { authentication: proof } : {}), ...(eventSubscriptions ? { eventSubscriptions } : {}) } }));
      } else if (m.op === 7) {
        const w = pending.get(m.d.requestId);
        pending.delete(m.d.requestId);
        m.d.requestStatus.result ? w?.res(m.d.responseData ?? {}) : w?.rej(new Error(m.d.requestStatus.comment || m.d.requestStatus.code));
      } else if (m.op === 5) {
        onEvent?.(m.d);
      } else if (m.op === 2) {
        try { resolve(await fn(request)); } catch (e) { reject(e); } finally { clearTimeout(timer); ws.close(); }
      }
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('obs-websocket-unavailable')); };
  });
}

export const scenes = { inicio: 'Iniciando Stream', coding: 'Coding', juego: 'Battlefield 6 — Día 2', dj: 'Streaming', brb: 'Vuelvo en un momento', fin: 'Terminando Stream' };
export const api = 'http://127.0.0.1:8765';
export const tool = (path) => fetch(`${api}${path}`, { method: 'POST', headers: { 'x-stream-tool': '1' } }).then((r) => r.json());
