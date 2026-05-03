import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { LocalAgentKind } from './local-worker-utils.js';

export interface AgentServiceConfig {
  url: string;
  type: 'http';
  timeoutMs: number;
  retries: number;
}

type AgentServiceConfigInput = Partial<{
  url: unknown;
  endpoint: unknown;
  type: unknown;
  timeout: unknown;
  timeoutMs: unknown;
  retry: unknown;
  retries: unknown;
}>;

const DEFAULTS: Record<LocalAgentKind, AgentServiceConfig> = {
  cursor: { url: 'http://localhost:5001', type: 'http', timeoutMs: 60_000, retries: 1 },
  claude: { url: 'http://localhost:5002', type: 'http', timeoutMs: 120_000, retries: 1 },
  copilot: { url: 'http://localhost:5003', type: 'http', timeoutMs: 120_000, retries: 1 },
  opencode: { url: 'http://localhost:5004', type: 'http', timeoutMs: 120_000, retries: 1 },
};

function envKey(agent: LocalAgentKind): string {
  return `OPSLY_${agent.toUpperCase()}_AGENT_URL`;
}

function normalizeConfig(
  agent: LocalAgentKind,
  input: AgentServiceConfigInput | undefined
): AgentServiceConfig {
  const base = DEFAULTS[agent];
  const rawUrl = input?.url ?? input?.endpoint;
  const rawTimeout = input?.timeoutMs ?? input?.timeout;
  const rawRetries = input?.retries ?? input?.retry;
  const envUrl = process.env[envKey(agent)];
  const url =
    typeof envUrl === 'string' && envUrl.trim().length > 0
      ? envUrl.trim()
      : typeof rawUrl === 'string' && rawUrl.trim().length > 0
        ? rawUrl.trim()
        : base.url;

  const timeoutMs =
    typeof rawTimeout === 'number' && Number.isFinite(rawTimeout)
      ? Math.max(1_000, Math.floor(rawTimeout))
      : base.timeoutMs;
  const retries =
    typeof rawRetries === 'number' && Number.isFinite(rawRetries)
      ? Math.max(1, Math.floor(rawRetries))
      : base.retries;

  return { url: url.replace(/\/+$/, ''), type: 'http', timeoutMs, retries };
}

async function readConfigFile(): Promise<Record<string, AgentServiceConfigInput>> {
  const rawPath = process.env.OPSLY_AGENT_SERVICES_CONFIG || 'config/agent-services.json';
  try {
    const raw = await readFile(resolve(rawPath), 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }
    const root = parsed as Record<string, unknown>;
    const services = typeof root.services === 'object' && root.services !== null ? root.services : root;
    return services as Record<string, AgentServiceConfigInput>;
  } catch {
    return {};
  }
}

export async function resolveAgentService(agent: LocalAgentKind): Promise<AgentServiceConfig> {
  const fileConfig = await readConfigFile();
  return normalizeConfig(agent, fileConfig[agent]);
}
