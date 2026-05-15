import { request, type RequestOptions } from 'node:http';
import { access } from 'node:fs/promises';
import { z } from 'zod';
import { opslyFetch } from '../lib/api-client.js';
import type { ToolDefinition } from '../types/index.js';

const DOCKER_SOCKET_PATH = '/var/run/docker.sock';
const ORCHESTRATOR_URL = process.env.MCP_ORCHESTRATOR_URL || 'http://orchestrator:3011';

type HealthToolResult = {
  ok: boolean;
  scope: 'platform' | 'tenant';
  service: string;
  data: unknown;
};

type RestartToolResult = {
  ok: boolean;
  container: string;
  method: 'docker_socket' | 'orchestrator_api';
  message: string;
};

async function dockerApi(path: string, method = 'GET', body?: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`http://localhost${path}`);
    const opts: RequestOptions = {
      socketPath: DOCKER_SOCKET_PATH,
      method,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = request(opts, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') reject(new Error('DOCKER_SOCKET_NOT_FOUND'));
      else reject(err);
    });
    req.setTimeout(10000, () => { req.destroy(new Error('DOCKER_API_TIMEOUT')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function dockerSocketAvailable(): Promise<boolean> {
  try {
    await access(DOCKER_SOCKET_PATH);
    return true;
  } catch {
    return false;
  }
}

async function restartViaSocket(container: string): Promise<RestartToolResult> {
  await dockerApi(`/containers/${encodeURIComponent(container)}/restart`, 'POST');
  return {
    ok: true,
    container,
    method: 'docker_socket',
    message: `Container ${container} restarted via Docker API`,
  };
}

async function restartViaOrchestrator(container: string): Promise<RestartToolResult> {
  const adminToken = process.env.PLATFORM_ADMIN_TOKEN || '';
  const response = await fetch(`${ORCHESTRATOR_URL}/api/admin/container/restart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ container }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Orchestrator restart failed (${response.status}): ${text}`);
  }
  return {
    ok: true,
    container,
    method: 'orchestrator_api',
    message: `Container ${container} restart requested via orchestrator`,
  };
}

const SAFE_IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{1,127}$/;

function assertSafeIdentifier(value: string, label: string): string {
  const trimmed = value.trim();
  if (!SAFE_IDENTIFIER.test(trimmed)) {
    throw new Error(`Invalid ${label}: use only letters, numbers, dot, dash or underscore`);
  }
  return trimmed;
}

const PLATFORM_SERVICE_ALIASES = new Set(['api', 'platform', 'opsly', 'core']);

function resolveHealthTarget(service?: string): {
  scope: 'platform' | 'tenant';
  service: string;
  path: string;
} {
  const raw = service?.trim();
  if (!raw || PLATFORM_SERVICE_ALIASES.has(raw.toLowerCase())) {
    return {
      scope: 'platform',
      service: raw && raw.length > 0 ? raw : 'platform',
      path: '/api/health',
    };
  }
  const tenantSlug = assertSafeIdentifier(raw.toLowerCase(), 'service');
  return {
    scope: 'tenant',
    service: tenantSlug,
    path: `/api/portal/health?slug=${encodeURIComponent(tenantSlug)}`,
  };
}

export const opsStubsTools: [
  ToolDefinition<{ service?: string }, HealthToolResult>,
  ToolDefinition<{ container: string }, RestartToolResult>,
] = [
  {
    name: 'check_service_health',
    description: 'Comprueba la salud de la plataforma o de un tenant por slug.',
    inputSchema: z.object({ service: z.string().optional() }),
    handler: async ({ service }) => {
      const target = resolveHealthTarget(service);
      const data = await opslyFetch(target.path);
      return {
        ok: true,
        scope: target.scope,
        service: target.service,
        data,
      };
    },
  },
  {
    name: 'restart_container',
    description:
      'Reinicia un contenedor Docker por nombre exacto. Usa Docker socket vía HTTP API (prioritario) o fallback al orquestador.',
    inputSchema: z.object({
      container: z.string().min(1).max(128),
    }),
    handler: async ({ container }) => {
      const safeContainer = assertSafeIdentifier(container, 'container');

      if (await dockerSocketAvailable()) {
        return restartViaSocket(safeContainer);
      }

      return restartViaOrchestrator(safeContainer);
    },
  },
];
