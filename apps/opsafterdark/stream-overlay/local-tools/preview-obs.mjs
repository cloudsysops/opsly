import crypto from 'node:crypto';
import fs from 'node:fs';

const root = 'C:/Users/opsly/OneDrive/Documents/ChatGPT/intcloudsysops/stream-overlay';
const config = JSON.parse(fs.readFileSync('C:/Users/opsly/AppData/Roaming/obs-studio/plugin_config/obs-websocket/config.json', 'utf8'));
const sourceName = process.argv[2] || 'Overlay PC — Live';
const outputName = process.argv[3] || 'overlay-preview.png';
const ws = new WebSocket(`ws://127.0.0.1:${config.server_port}`);

function authenticate(password, salt, challenge) {
  const secret = crypto.createHash('sha256').update(password + salt).digest('base64');
  return crypto.createHash('sha256').update(secret + challenge).digest('base64');
}

ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.op === 0) {
    const authentication = message.d.authentication;
    ws.send(JSON.stringify({ op: 1, d: { rpcVersion: 1, authentication: authenticate(config.server_password, authentication.salt, authentication.challenge) } }));
  } else if (message.op === 2) {
    ws.send(JSON.stringify({ op: 6, d: { requestType: 'GetSourceScreenshot', requestId: 'preview', requestData: { sourceName, imageFormat: 'png', imageWidth: 1280, imageHeight: 720, imageCompressionQuality: 100 } } }));
  } else if (message.op === 7 && message.d.requestId === 'preview') {
    const image = message.d.responseData.imageData.split(',', 2)[1];
    fs.writeFileSync(`${root}/${outputName}`, Buffer.from(image, 'base64'));
    console.log(JSON.stringify({ preview: 'ready' }));
    ws.close();
  }
};

ws.onerror = () => {
  console.log(JSON.stringify({ preview: 'failed' }));
  process.exitCode = 1;
};
