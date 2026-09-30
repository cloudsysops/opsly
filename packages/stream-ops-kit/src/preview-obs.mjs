// Captura una screenshot de una fuente de OBS y la guarda en la carpeta de datos del tenant.
//   node preview-obs.mjs [nombreFuente] [archivo-salida.png]
import fs from 'node:fs';
import path from 'node:path';
import { readObsWebsocketConfig, authenticate } from './obs-connection.mjs';
import { tenantConfig } from './tenant-config.mjs';
import { tenantPath } from './tenant-paths.mjs';

const config = readObsWebsocketConfig();
const sourceName = process.argv[2] || tenantConfig().overlaySourceName || 'Overlay';
const outputName = process.argv[3] || 'overlay-preview.png';
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);

ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const authentication = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authenticate(config.server_password, authentication.salt, authentication.challenge) } }));
  } else if (message.op === 2) {
    ws.send(JSON.stringify({ op: 6, d: { requestType: 'GetSourceScreenshot', requestId: 'preview', requestData: { sourceName, imageFormat: 'png', imageWidth: 1280, imageHeight: 720, imageCompressionQuality: 100 } } }));
  } else if (message.op === 7 && message.d.requestId === 'preview') {
    const image = message.d.responseData.imageData.split(',', 2)[1];
    fs.writeFileSync(path.join(tenantPath(), outputName), Buffer.from(image, 'base64'));
    console.log(JSON.stringify({ preview: 'ready' }));
    ws.close();
  }
};

ws.onerror = () => {
  console.log(JSON.stringify({ preview: 'failed' }));
  process.exitCode = 1;
};
