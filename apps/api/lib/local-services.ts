import { LOCAL_SERVICES_API } from './constants';

export type LocalServiceId =
  | 'api'
  | 'admin'
  | 'portal'
  | 'mcp'
  | 'llm_gateway'
  | 'orchestrator'
  | 'context_builder'
  | 'ollama';

export type LocalServiceCatalogEntry = {
  id: LocalServiceId;
  label: string;
  role: string;
  base_url: string;
  health_path: string;
};

export type LocalServiceProbeResult = {
  ok: boolean;
  status: number;
  latency_ms: number;
  error?: string;
};

export function isLocalServicesApiEnabled(): boolean {
  if (process.env.ALLOW_LOCAL_SERVICES_API?.trim().toLowerCase() === 'true') {
    return true;
  }
  return process.env.NODE_ENV === 'development';
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  const max = LOCAL_SERVICES_API.PORT_MAX_EXCLUSIVE;
  return Number.isFinite(n) && n > 0 && n < max ? n : fallback;
}

function resolveHost(): string {
  const h = process.env.LOCAL_SERVICES_HOST?.trim();
  return h && h.length > 0 ? h : LOCAL_SERVICES_API.DEFAULT_HOST;
}

function optionalBaseFromEnv(...keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) {
      return trimSlash(v);
    }
  }
  return null;
}

function llmGatewayBase(host: string): string {
  const fromEnv = optionalBaseFromEnv(
    'MCP_LLM_GATEWAY_URL',
    'LLM_GATEWAY_INTERNAL_URL',
    'ORCHESTRATOR_LLM_GATEWAY_URL'
  );
  if (fromEnv) {
    return fromEnv;
  }
  const port = parsePort(
    process.env.LOCAL_LLM_GATEWAY_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_LLM_GATEWAY
  );
  return `http://${host}:${String(port)}`;
}

function orchestratorBase(host: string): string {
  const fromEnv = optionalBaseFromEnv('MCP_ORCHESTRATOR_URL', 'ORCHESTRATOR_INTERNAL_URL');
  if (fromEnv) {
    return fromEnv;
  }
  const port = parsePort(
    process.env.LOCAL_ORCHESTRATOR_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_ORCHESTRATOR
  );
  return `http://${host}:${String(port)}`;
}

function contextBuilderBase(host: string): string {
  const fromEnv = optionalBaseFromEnv('MCP_CONTEXT_BUILDER_URL', 'CONTEXT_BUILDER_INTERNAL_URL');
  if (fromEnv) {
    return fromEnv;
  }
  const port = parsePort(
    process.env.LOCAL_CONTEXT_BUILDER_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_CONTEXT_BUILDER
  );
  return `http://${host}:${String(port)}`;
}

function mcpBase(host: string): string {
  const fromEnv = optionalBaseFromEnv('MCP_SELF_URL', 'MCP_PUBLIC_URL');
  if (fromEnv) {
    return fromEnv;
  }
  const port = parsePort(
    process.env.LOCAL_MCP_PORT ?? process.env.MCP_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_MCP
  );
  return `http://${host}:${String(port)}`;
}

function nextAppServices(
  host: string,
  apiPort: number,
  adminPort: number,
  portalPort: number
): LocalServiceCatalogEntry[] {
  return [
    {
      id: 'api',
      label: 'Opsly API',
      role: 'control_plane',
      base_url: `http://${host}:${String(apiPort)}`,
      health_path: '/api/health',
    },
    {
      id: 'admin',
      label: 'Opsly Admin',
      role: 'control_plane',
      base_url: `http://${host}:${String(adminPort)}`,
      health_path: '/api/health',
    },
    {
      id: 'portal',
      label: 'Opsly Portal',
      role: 'edge',
      base_url: `http://${host}:${String(portalPort)}`,
      health_path: '/api/health',
    },
  ];
}

function openClawHttpServices(host: string): LocalServiceCatalogEntry[] {
  return [
    {
      id: 'mcp',
      label: 'OpenClaw MCP',
      role: 'control_plane',
      base_url: mcpBase(host),
      health_path: '/health',
    },
    {
      id: 'llm_gateway',
      label: 'LLM Gateway',
      role: 'inference',
      base_url: llmGatewayBase(host),
      health_path: '/health',
    },
    {
      id: 'orchestrator',
      label: 'Orchestrator',
      role: 'control_plane',
      base_url: orchestratorBase(host),
      health_path: '/health',
    },
    {
      id: 'context_builder',
      label: 'Context Builder',
      role: 'control_plane',
      base_url: contextBuilderBase(host),
      health_path: '/health',
    },
  ];
}

function coreCatalog(host: string): LocalServiceCatalogEntry[] {
  const apiPort = parsePort(
    process.env.PORT ?? process.env.API_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_API
  );
  const adminPort = parsePort(process.env.LOCAL_ADMIN_PORT, LOCAL_SERVICES_API.DEFAULT_PORT_ADMIN);
  const portalPort = parsePort(
    process.env.LOCAL_PORTAL_PORT,
    LOCAL_SERVICES_API.DEFAULT_PORT_PORTAL
  );
  return [...nextAppServices(host, apiPort, adminPort, portalPort), ...openClawHttpServices(host)];
}

export function buildLocalServiceCatalog(): LocalServiceCatalogEntry[] {
  const host = resolveHost();
  const entries = [...coreCatalog(host)];
  const ollamaUrl = process.env.OLLAMA_URL?.trim();
  if (ollamaUrl) {
    entries.push({
      id: 'ollama',
      label: 'Ollama',
      role: 'inference',
      base_url: trimSlash(ollamaUrl),
      health_path: '/api/tags',
    });
  }
  return entries;
}

export function healthUrl(entry: LocalServiceCatalogEntry): string {
  return `${entry.base_url}${entry.health_path}`;
}

export async function probeLocalService(
  entry: LocalServiceCatalogEntry
): Promise<LocalServiceProbeResult> {
  const url = healthUrl(entry);
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, LOCAL_SERVICES_API.PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const latency_ms = Math.round(performance.now() - started);
    return { ok: res.ok, status: res.status, latency_ms };
  } catch (err) {
    const latency_ms = Math.round(performance.now() - started);
    return {
      ok: false,
      status: 0,
      latency_ms,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}
