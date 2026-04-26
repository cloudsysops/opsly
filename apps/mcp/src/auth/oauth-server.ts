import { getRedisClient } from '@intcloudsysops/llm-gateway/cache';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { verifyCodeChallenge } from './pkce.js';
import { generateAccessToken, generateAuthCode } from './tokens.js';
import { buildAuthorizationServerMetadata } from './well-known.js';

export type RegisteredOAuthClient = {
  name: string;
  redirect_uris: string[];
  scopes: string[];
};

/** Clientes públicos (PKCE); en producción se pueden externalizar a Supabase. */
export const REGISTERED_CLIENTS: Record<string, RegisteredOAuthClient> = {
  'claude-ai': {
    name: 'Claude.ai',
    redirect_uris: ['https://claude.ai/oauth/callback', 'http://localhost:3000/oauth/callback'],
    scopes: [
      'tenants:read',
      'tenants:write',
      'metrics:read',
      'invitations:write',
      'executor:write',
      'agents:write',
    ],
  },
};

export type StoredAuthCode = {
  client_id: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  expires_at: number;
};

/** TTL alineado a setEx (10 min); no usar Map en memoria — soporta varias réplicas MCP. */
const AUTH_CODE_TTL_MS = 600_000;
const AUTH_CODE_TTL_SECONDS = 600;

/** Redis key vía @intcloudsysops/llm-gateway/cache (mismo cliente que cache LLM). */
function oauthCodeKey(code: string): string {
  return `oauth:code:${code}`;
}

function oauthIssuerBase(): string {
  const explicit = process.env.MCP_PUBLIC_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const domain = process.env.PLATFORM_DOMAIN?.trim();
  if (domain) {
    return `https://mcp.${domain}`.replace(/\/$/, '');
  }
  const port = process.env.PORT?.trim() || '3003';
  return `http://127.0.0.1:${port}`;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

function redirect(res: ServerResponse, location: string): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(302, { Location: location });
  res.end();
}

/**
 * Maneja rutas OAuth del MCP HTTP server.
 * @returns true si la petición fue atendida (incl. errores OAuth).
 */
export async function handleOAuthRequest(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  searchParams: URLSearchParams,
  body: string
): Promise<boolean> {
  if (pathname === '/.well-known/oauth-authorization-server') {
    const base = oauthIssuerBase();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(JSON.stringify(buildAuthorizationServerMetadata(base)));
    return true;
  }

  if (pathname === '/oauth/authorize' && req.method === 'GET') {
    const responseType = searchParams.get('response_type');
    if (responseType !== 'code') {
      json(res, 400, {
        error:
          responseType === null || responseType === ''
            ? 'invalid_request'
            : 'unsupported_response_type',
      });
      return true;
    }

    const clientId = searchParams.get('client_id');
    const redirectUri = searchParams.get('redirect_uri');
    const codeChallenge = searchParams.get('code_challenge');
    const codeChallengeMethod = searchParams.get('code_challenge_method') || 'S256';
    const scope = searchParams.get('scope') || 'tenants:read';
    const state = searchParams.get('state') || '';

    if (!clientId || !codeChallenge || !redirectUri) {
      json(res, 400, { error: 'invalid_request' });
      return true;
    }

    const client = REGISTERED_CLIENTS[clientId];
    if (!client || !client.redirect_uris.includes(redirectUri)) {
      json(res, 400, { error: 'unauthorized_client' });
      return true;
    }

    const requestedScopes = scope.split(/\s+/).filter(Boolean);
    const allowed = new Set(client.scopes);
    if (requestedScopes.some((s) => !allowed.has(s))) {
      json(res, 400, { error: 'invalid_scope' });
      return true;
    }
    const scopesToGrant = requestedScopes.length > 0 ? requestedScopes : ['tenants:read'];

    const code = generateAuthCode();
    const stored: StoredAuthCode = {
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope: scopesToGrant.join(' '),
      expires_at: Date.now() + AUTH_CODE_TTL_MS,
    };
    const redis = await getRedisClient();
    await redis.setEx(oauthCodeKey(code), AUTH_CODE_TTL_SECONDS, JSON.stringify(stored));

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) {
      callbackUrl.searchParams.set('state', state);
    }
    redirect(res, callbackUrl.toString());
    return true;
  }

  if (pathname === '/oauth/token' && req.method === 'POST') {
    const contentType = req.headers['content-type'] ?? '';
    if (!contentType.toLowerCase().includes('application/x-www-form-urlencoded')) {
      json(res, 400, {
        error: 'invalid_request',
        error_description: 'Content-Type must be application/x-www-form-urlencoded',
      });
      return true;
    }

    let params: Record<string, string>;
    try {
      params = Object.fromEntries(new URLSearchParams(body));
    } catch {
      json(res, 400, { error: 'invalid_request' });
      return true;
    }

    const code = params.code;
    const codeVerifier = params.code_verifier;
    const clientId = params.client_id;
    const grantType = params.grant_type;

    if (grantType !== 'authorization_code') {
      json(res, 400, { error: 'unsupported_grant_type' });
      return true;
    }

    if (!code || !codeVerifier || !clientId) {
      json(res, 400, { error: 'invalid_request' });
      return true;
    }

    const redis = await getRedisClient();
    const raw = await redis.get(oauthCodeKey(code));
    let stored: StoredAuthCode | null = null;
    if (raw) {
      try {
        stored = JSON.parse(raw) as StoredAuthCode;
      } catch {
        stored = null;
      }
    }
    if (!stored || stored.expires_at < Date.now()) {
      json(res, 400, { error: 'invalid_grant' });
      return true;
    }

    if (stored.client_id !== clientId) {
      json(res, 400, { error: 'invalid_client' });
      return true;
    }

    const method = stored.code_challenge_method === 'plain' ? 'plain' : ('S256' as const);
    const valid = verifyCodeChallenge(codeVerifier, stored.code_challenge, method);
    if (!valid) {
      json(res, 400, { error: 'invalid_grant' });
      return true;
    }

    await redis.del(oauthCodeKey(code));

    const scopeList = stored.scope.split(/\s+/).filter(Boolean);
    const accessToken = generateAccessToken(clientId, scopeList);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    res.end(
      JSON.stringify({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: stored.scope,
      })
    );
    return true;
  }

  return false;
}
