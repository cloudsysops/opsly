#!/usr/bin/env tsx
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { google } from 'googleapis';

type ClientShape = {
  installed?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
  web?: {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
  };
};

type Options = {
  apply: boolean;
  clientJson?: string;
  project: string;
  config: string;
  port: number;
  channelSecretName?: string;
};

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.upload',
];

function parseArgs(argv: string[]): Options {
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const portRaw = value('--port') ?? '8768';
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('--port must be an integer between 1024 and 65535');
  }

  const channelSecretName = value('--channel-secret-name');
  if (
    channelSecretName &&
    !/^YOUTUBE_[A-Z0-9_]+_CHANNEL_ID$/.test(channelSecretName)
  ) {
    throw new Error(
      '--channel-secret-name must match YOUTUBE_<LANE>_CHANNEL_ID'
    );
  }

  return {
    apply: argv.includes('--apply'),
    clientJson: value('--client-json'),
    project: value('--project') ?? 'ops-intcloudsysops',
    config: value('--config') ?? 'prd',
    port,
    channelSecretName,
  };
}

function readClient(path: string): {
  clientId: string;
  clientSecret: string;
} {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as ClientShape;
  const source = parsed.installed ?? parsed.web;
  if (!source?.client_id || !source.client_secret) {
    throw new Error(
      'OAuth client JSON must contain installed/web client_id and client_secret'
    );
  }
  return { clientId: source.client_id, clientSecret: source.client_secret };
}

function openBrowser(url: string): void {
  const child =
    process.platform === 'darwin'
      ? spawn('open', [url], { detached: true, stdio: 'ignore' })
      : process.platform === 'win32'
        ? spawn('cmd', ['/c', 'start', '', url], {
            detached: true,
            stdio: 'ignore',
          })
        : spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
  child.unref();
}

async function waitForAuthorizationCode(
  port: number,
  expectedState: string
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timed out after 5 minutes'));
    }, 5 * 60 * 1000);

    const server = createServer((req, res) => {
      try {
        const url = new URL(
          req.url ?? '/',
          `http://127.0.0.1:${port}`
        );
        if (url.pathname !== '/oauth2callback') {
          res.writeHead(404).end('Not found');
          return;
        }

        const error = url.searchParams.get('error');
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');

        if (error) {
          clearTimeout(timeout);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('YouTube authorization failed. You may close this window.');
          server.close();
          reject(new Error(`OAuth consent returned error: ${error}`));
          return;
        }

        if (!state || state !== expectedState) {
          clearTimeout(timeout);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid OAuth state. You may close this window.');
          server.close();
          reject(new Error('OAuth callback state mismatch'));
          return;
        }

        if (!code) {
          clearTimeout(timeout);
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing authorization code. You may close this window.');
          server.close();
          reject(new Error('OAuth callback missing authorization code'));
          return;
        }

        clearTimeout(timeout);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end(
          'YouTube authorization verified. You may close this window and return to Opsly.'
        );
        server.close();
        resolve(code);
      } catch (err) {
        clearTimeout(timeout);
        server.close();
        reject(err);
      }
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`oauth_callback=127.0.0.1:${port}/oauth2callback`);
    });
  });
}

function ensureDopplerSession(): void {
  const version = spawnSync('doppler', ['--version'], {
    stdio: 'ignore',
  });
  if (version.status !== 0) {
    throw new Error('Doppler CLI is not installed or not executable');
  }

  const me = spawnSync('doppler', ['me'], {
    stdio: 'ignore',
  });
  if (me.status !== 0) {
    throw new Error('Doppler CLI is not authenticated; run doppler login first');
  }
}

function setDopplerSecret(
  name: string,
  secretValue: string,
  project: string,
  config: string
): void {
  const result = spawnSync(
    'doppler',
    [
      'secrets',
      'set',
      name,
      '--project',
      project,
      '--config',
      config,
      '--silent',
    ],
    {
      input: secretValue,
      encoding: 'utf8',
      stdio: ['pipe', 'ignore', 'pipe'],
    }
  );

  if (result.status !== 0) {
    const stderr =
      typeof result.stderr === 'string'
        ? result.stderr.split('\n')[0]?.slice(0, 180)
        : 'unknown Doppler error';
    throw new Error(`Failed to store ${name} in Doppler: ${stderr}`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.log('youtube_oauth_setup=planned');
  console.log(`mode=${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`doppler_project=${options.project}`);
  console.log(`doppler_config=${options.config}`);
  console.log(`oauth_callback_host=127.0.0.1`);
  console.log(`oauth_callback_port=${options.port}`);
  console.log(`oauth_scopes=${SCOPES.join(',')}`);
  console.log(
    `channel_secret_name=${options.channelSecretName ?? 'not-requested'}`
  );
  console.log(
    'doppler_keys=YOUTUBE_CLIENT_ID,YOUTUBE_CLIENT_SECRET,YOUTUBE_REFRESH_TOKEN'
  );

  if (!options.apply) {
    console.log('YOUTUBE_OAUTH_SETUP_DRY_RUN_OK');
    return;
  }

  if (!options.clientJson) {
    throw new Error('--client-json is required with --apply');
  }

  ensureDopplerSession();

  const { clientId, clientSecret } = readClient(options.clientJson);
  const redirectUri = `http://127.0.0.1:${options.port}/oauth2callback`;
  const auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const state = randomBytes(24).toString('hex');

  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });

  console.log('oauth_consent=opening_browser');
  const codePromise = waitForAuthorizationCode(options.port, state);
  openBrowser(authUrl);
  const code = await codePromise;

  const { tokens } = await auth.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      'Google did not return a refresh token; consent must return offline access'
    );
  }

  auth.setCredentials(tokens);
  const youtube = google.youtube({ version: 'v3', auth });
  const response = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
    maxResults: 50,
  });

  const channels = (response.data.items ?? []).filter((item) => Boolean(item.id));
  if (channels.length === 0) {
    throw new Error('OAuth succeeded but channels.mine returned no channel');
  }

  const primary = channels[0];
  const channelId = primary?.id as string;
  const channelTitle = primary?.snippet?.title ?? 'unknown';

  console.log('oauth_token_exchange=PASS');
  console.log('channels_mine=PASS');
  console.log(`channel_count=${channels.length}`);
  console.log(`channel_id=${channelId}`);
  console.log(`channel_title=${channelTitle}`);

  setDopplerSecret('YOUTUBE_CLIENT_ID', clientId, options.project, options.config);
  setDopplerSecret(
    'YOUTUBE_CLIENT_SECRET',
    clientSecret,
    options.project,
    options.config
  );
  setDopplerSecret(
    'YOUTUBE_REFRESH_TOKEN',
    tokens.refresh_token,
    options.project,
    options.config
  );

  if (options.channelSecretName) {
    setDopplerSecret(
      options.channelSecretName,
      channelId,
      options.project,
      options.config
    );
  }

  console.log('doppler_write=PASS');
  console.log(`YOUTUBE_OAUTH_REAUTHORIZED:${channelId}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`youtube_oauth_setup_error=${message.split('\n')[0]?.slice(0, 240)}`);
  console.log('YOUTUBE_OAUTH_REAUTHORIZE_FAILED');
  process.exitCode = 1;
});
