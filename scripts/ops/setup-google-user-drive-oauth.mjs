#!/usr/bin/env node
/**
 * One-shot: OAuth usuario (Drive) → GOOGLE_USER_CREDENTIALS_JSON en Doppler.
 * Reutiliza YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET (mismo proyecto GCP).
 *
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     node scripts/ops/setup-google-user-drive-oauth.mjs
 *
 * Si el client es tipo Web, añade en Google Cloud Console → Credentials:
 *   http://127.0.0.1:8765/oauth2callback
 */
import http from 'node:http';
import { URL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { google } from 'googleapis';

const PORT = Number(process.env.OAUTH_LOOPBACK_PORT || 8765);
const REDIRECT = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

const clientId = String(process.env.YOUTUBE_CLIENT_ID ?? '').trim();
const clientSecret = String(process.env.YOUTUBE_CLIENT_SECRET ?? '').trim();
if (!clientId || !clientSecret) {
  console.error('Faltan YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET en el entorno (doppler run).');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('OAuth Drive (usuario) — cuenta: la de My Drive (cboteros1@gmail.com)');
console.log('Redirect registrado necesario:', REDIRECT);
console.log('');
console.log('Abre esta URL en el navegador:');
console.log(authUrl);
console.log('');

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    if (u.pathname !== '/oauth2callback') {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const err = u.searchParams.get('error');
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`OAuth error: ${err}`);
      console.error('OAuth error:', err);
      server.close();
      process.exit(1);
    }
    const code = u.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('missing code');
      return;
    }
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No refresh_token. Revoca el acceso de la app en Google Account y reintenta con prompt=consent.');
      console.error('Sin refresh_token');
      server.close();
      process.exit(1);
    }

    const payload = {
      type: 'authorized_user',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: tokens.refresh_token,
    };
    const json = JSON.stringify(payload);

    execFileSync(
      'doppler',
      ['secrets', 'set', 'GOOGLE_USER_CREDENTIALS_JSON', '--project', 'ops-intcloudsysops', '--config', 'prd'],
      { input: json, stdio: ['pipe', 'inherit', 'inherit'] },
    );

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>OK</h1><p>GOOGLE_USER_CREDENTIALS_JSON guardado en Doppler. Puedes cerrar esta pestaña.</p>');
    console.log('OK: GOOGLE_USER_CREDENTIALS_JSON escrito en Doppler prd (valor no mostrado).');
    server.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    res.writeHead(500);
    res.end(String(e.message || e));
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Esperando callback en ${REDIRECT} …`);
  // Best-effort open browser (WSL → Windows)
  try {
    execFileSync('cmd.exe', ['/c', 'start', '', authUrl], { stdio: 'ignore' });
  } catch {
    /* user opens URL manually */
  }
});
