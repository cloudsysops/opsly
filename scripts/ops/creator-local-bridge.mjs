import { createServer } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

export function isLoopbackHost(host) {
  return host === '127.0.0.1' || host === '::1' || host === 'localhost';
}

export function generateCreatorBridgeToken() {
  return randomBytes(32).toString('base64url');
}

function assertToken(token) {
  if (typeof token !== 'string' || token.length < 32) {
    throw new Error('Creator Local Bridge token must be at least 32 characters');
  }
}

function tokenMatches(actual, expected) {
  if (typeof actual !== 'string') return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function readBearerToken(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

function sendJson(res, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body));
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(payload.length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(payload);
}

export function createCreatorLocalBridge(options = {}) {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? 0;
  const sessionId = options.sessionId ?? randomUUID();
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const grantedCapabilities = new Set(options.capabilities ?? ['bridge.read']);

  if (!isLoopbackHost(host)) {
    throw new Error(`Creator Local Bridge must bind to loopback; refused host "${host}"`);
  }

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('Creator Local Bridge port must be an integer from 0 to 65535');
  }

  if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1024) {
    throw new Error('maxBodyBytes must be an integer >= 1024');
  }

  let currentToken = options.token ?? generateCreatorBridgeToken();
  assertToken(currentToken);

  const server = createServer((req, res) => {
    const method = req.method ?? 'GET';
    const urlHost = host === '::1' ? '[::1]' : host;
    const requestUrl = new URL(req.url ?? '/', `http://${urlHost}`);

    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      sendJson(res, 413, { error: 'request_too_large' });
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/health') {
      sendJson(res, 200, {
        status: 'ok',
        binding: 'loopback',
        sessionId,
      });
      return;
    }

    const bearer = readBearerToken(req);
    if (!bearer || !tokenMatches(bearer, currentToken)) {
      sendJson(res, 401, { error: 'unauthorized' });
      return;
    }

    if (method === 'GET' && requestUrl.pathname === '/v1/capabilities') {
      if (!grantedCapabilities.has('bridge.read')) {
        sendJson(res, 403, { error: 'capability_denied', capability: 'bridge.read' });
        return;
      }

      sendJson(res, 200, {
        sessionId,
        capabilities: [...grantedCapabilities].sort(),
      });
      return;
    }

    sendJson(res, 404, { error: 'not_found' });
  });

  return {
    host,
    port,
    sessionId,

    async start() {
      if (server.listening) {
        throw new Error('Creator Local Bridge is already listening');
      }

      await new Promise((resolvePromise, rejectPromise) => {
        const onError = error => {
          server.off('listening', onListening);
          rejectPromise(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolvePromise();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
      });

      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Creator Local Bridge did not expose a TCP address');
      }

      return {
        host,
        port: address.port,
        sessionId,
        url: `http://${host === '::1' ? '[::1]' : host}:${address.port}`,
      };
    },

    async close() {
      if (!server.listening) return;
      await new Promise((resolvePromise, rejectPromise) => {
        server.close(error => (error ? rejectPromise(error) : resolvePromise()));
      });
    },

    rotateToken(nextToken = generateCreatorBridgeToken()) {
      assertToken(nextToken);
      currentToken = nextToken;
      return nextToken;
    },

    hasCapability(capability) {
      return grantedCapabilities.has(capability);
    },
  };
}

async function runCli() {
  const token = process.env.OPSLY_CREATOR_BRIDGE_TOKEN;
  assertToken(token);

  const port = Number(process.env.OPSLY_CREATOR_BRIDGE_PORT ?? 4318);
  const bridge = createCreatorLocalBridge({
    host: DEFAULT_HOST,
    port,
    token,
    capabilities: ['bridge.read'],
  });

  const info = await bridge.start();
  process.stdout.write(
    `CREATOR_LOCAL_BRIDGE_READY ${JSON.stringify({
      url: info.url,
      sessionId: info.sessionId,
      binding: 'loopback',
    })}\n`,
  );

  const shutdown = async () => {
    await bridge.close();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  runCli().catch(error => {
    process.stderr.write(`CREATOR_LOCAL_BRIDGE_ERROR ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
