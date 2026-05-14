#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import {
  resolveToOpslyLocalAgentKind,
  externalCliLabelForOpslyLocalAgent,
  isConfigurableLocalBridgeKey,
} from '../apps/orchestrator/src/lib/local-worker-utils.js';

type Command = 'start' | 'stop' | 'status' | 'submit';

interface CliOptions {
  agent?: string;
  prompt?: string;
  json: boolean;
}

interface AgentRuntimeState {
  agent: string;
  pid: number;
  command: string;
  started_at: string;
}

interface AgentServiceConfig {
  enabled?: boolean;
  url?: string;
  type?: string;
  timeoutMs?: number;
  retries?: number;
  envUrl?: string;
}

interface AgentServicesJson {
  services?: Record<string, AgentServiceConfig>;
}

interface LocalSubmitResponse {
  success?: boolean;
  ok?: boolean;
  job_id?: string | null;
  job_type?: string;
  control_mode?: string;
  prepared_only?: boolean;
  request_id?: string;
  error?: string;
}

const repoRoot = resolve(new URL('..', import.meta.url).pathname);
const runtimeDir = join(repoRoot, '.cursor', 'agent-processes');
const registryPath = join(repoRoot, 'config', 'agent-services.json');
const orchestratorUrl = (process.env.OPSLY_ORCHESTRATOR_URL || 'http://127.0.0.1:3011').replace(/\/+$/, '');
const platformToken = process.env.PLATFORM_ADMIN_TOKEN || process.env.OPSLY_PLATFORM_ADMIN_TOKEN || '';

function printUsage(): void {
  console.log(`Usage:
  tsx scripts/opsly-agent-cli.ts status [--json]
  tsx scripts/opsly-agent-cli.ts start <agent>
  tsx scripts/opsly-agent-cli.ts stop <agent>
  tsx scripts/opsly-agent-cli.ts submit --agent <agent> --prompt <text|file>

Environment:
  OPSLY_ORCHESTRATOR_URL              Default: http://127.0.0.1:3011
  PLATFORM_ADMIN_TOKEN                Required for submit/status API calls
  OPSLY_AGENT_<EXTERNAL_CLI_UPPER>_START_CMD   Optional override (e.g. CURSOR for local_cursor)
`);
}

function parseArgs(argv: string[]): { command: Command | null; options: CliOptions } {
  const [commandRaw, ...rest] = argv;
  const command = isCommand(commandRaw) ? commandRaw : null;
  const options: CliOptions = { json: false };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--agent') {
      options.agent = rest[i + 1];
      i += 1;
    } else if (arg === '--prompt') {
      options.prompt = rest[i + 1];
      i += 1;
    } else if (!options.agent && (command === 'start' || command === 'stop')) {
      options.agent = arg;
    }
  }

  return { command, options };
}

function isCommand(value: string | undefined): value is Command {
  return value === 'start' || value === 'stop' || value === 'status' || value === 'submit';
}

function normalizeAgent(agent: string | undefined): string {
  const raw = (agent ?? 'cursor').trim();
  return resolveToOpslyLocalAgentKind(raw);
}

function pidFile(agent: string): string {
  return join(runtimeDir, `${agent}.json`);
}

function readRegistry(): AgentServicesJson {
  if (!existsSync(registryPath)) {
    return { services: {} };
  }

  return JSON.parse(readFileSync(registryPath, 'utf-8')) as AgentServicesJson;
}

function readAgentState(agent: string): AgentRuntimeState | null {
  const file = pidFile(agent);
  if (!existsSync(file)) {
    return null;
  }

  return JSON.parse(readFileSync(file, 'utf-8')) as AgentRuntimeState;
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startCommandFor(agentOpslyId: string): string | null {
  const resolved = resolveToOpslyLocalAgentKind(agentOpslyId);
  const envSegment = externalCliLabelForOpslyLocalAgent(resolved).toUpperCase().replace(/[^A-Z0-9]/g, '_');
  const envName = `OPSLY_AGENT_${envSegment}_START_CMD`;
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const defaults: Record<string, string> = {
    local_cursor: 'npm run opsly:local-cursor-service',
    local_claude: 'npm run opsly:local-claude-service',
    local_copilot: 'npm run opsly:local-copilot-service',
    local_opencode: 'npm run opsly:local-opencode-service',
    local_codex: 'npm run opsly:local-codex-service',
    local_openai: 'npm run opsly:local-openai-service',
    local_hermes: 'npm run opsly:local-hermes-service',
    local_decepticon: 'npm run opsly:local-decepticon-service',
    local_aider: 'npm run opsly:local-aider-service',
    local_goose: 'npm run opsly:local-goose-service',
    local_playwright: 'npm run opsly:local-playwright-service',
  };

  return defaults[resolved] ?? null;
}

async function startAgent(agent: string): Promise<void> {
  await mkdir(runtimeDir, { recursive: true });
  const existing = readAgentState(agent);
  if (existing && isPidRunning(existing.pid)) {
    console.log(`${agent} already running pid=${existing.pid}`);
    return;
  }

  const command = startCommandFor(agent);
  if (!command) {
    const seg = externalCliLabelForOpslyLocalAgent(resolveToOpslyLocalAgentKind(agent)).toUpperCase();
    throw new Error(`No safe start command for ${agent}. Set OPSLY_AGENT_${seg}_START_CMD.`);
  }

  const child = spawn(command, {
    cwd: repoRoot,
    detached: true,
    shell: true,
    stdio: 'ignore',
  });
  child.unref();

  const state: AgentRuntimeState = {
    agent,
    pid: child.pid ?? 0,
    command,
    started_at: new Date().toISOString(),
  };
  writeFileSync(pidFile(agent), JSON.stringify(state, null, 2));
  console.log(`started ${agent} pid=${state.pid}`);
}

function stopAgent(agent: string): void {
  const state = readAgentState(agent);
  if (!state) {
    console.log(`${agent} not running`);
    return;
  }

  if (isPidRunning(state.pid)) {
    process.kill(-state.pid, 'SIGTERM');
  }
  unlinkSync(pidFile(agent));
  console.log(`stopped ${agent} pid=${state.pid}`);
}

async function getLocalState(): Promise<Record<string, unknown> | null> {
  if (!platformToken) {
    return null;
  }

  const response = await fetch(`${orchestratorUrl}/api/local/state`, {
    headers: { Authorization: `Bearer ${platformToken}` },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    return { error: `orchestrator_status_${response.status}` };
  }

  return (await response.json()) as Record<string, unknown>;
}

async function showStatus(json: boolean): Promise<void> {
  const registry = readRegistry();
  const services = Object.keys(registry.services ?? {}).filter((name) => isConfigurableLocalBridgeKey(name));
  const local = services.map((agent) => {
    const state = readAgentState(agent);
    return {
      agent,
      configured: true,
      enabled: registry.services?.[agent]?.enabled ?? false,
      url:
        (registry.services?.[agent]?.envUrl ? process.env[registry.services[agent].envUrl] : undefined) ??
        registry.services?.[agent]?.url ??
        null,
      pid: state?.pid ?? null,
      running: state ? isPidRunning(state.pid) : false,
    };
  });
  const orchestrator = await getLocalState();
  const payload = { local, orchestrator };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  for (const item of local) {
    const status = item.running ? `running pid=${item.pid}` : 'stopped';
    console.log(`${item.agent.padEnd(10)} ${status} enabled=${item.enabled} url=${item.url}`);
  }
  if (orchestrator) {
    console.log(`orchestrator ${orchestratorUrl} reachable`);
  } else {
    console.log(`orchestrator ${orchestratorUrl} not queried (missing PLATFORM_ADMIN_TOKEN)`);
  }
}

function readPrompt(prompt: string | undefined): string {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('--prompt is required');
  }

  const maybeFile = resolve(repoRoot, prompt);
  if (existsSync(maybeFile)) {
    return readFileSync(maybeFile, 'utf-8');
  }

  return prompt;
}

async function submitPrompt(agent: string, prompt: string | undefined): Promise<void> {
  if (!platformToken) {
    throw new Error('PLATFORM_ADMIN_TOKEN or OPSLY_PLATFORM_ADMIN_TOKEN is required for submit');
  }

  const response = await fetch(`${orchestratorUrl}/api/local/prompt-submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${platformToken}`,
      'Content-Type': 'application/json',
      'x-autonomy-approved': 'true',
    },
    body: JSON.stringify({
      tenant_slug: 'local',
      agent,
      prompt_body: readPrompt(prompt),
    }),
    signal: AbortSignal.timeout(10000),
  });

  const raw = await response.text();
  const payload = raw.length > 0 ? (JSON.parse(raw) as LocalSubmitResponse) : {};
  if (!response.ok) {
    throw new Error(payload.error || `submit failed with HTTP ${response.status}`);
  }

  console.log(
    `submitted agent=${agent} job_type=${payload.job_type ?? 'unknown'} job_id=${payload.job_id ?? 'none'} mode=${payload.control_mode ?? 'unknown'}`
  );
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const agent = normalizeAgent(options.agent);
  if (command === 'start') {
    await startAgent(agent);
  } else if (command === 'stop') {
    stopAgent(agent);
  } else if (command === 'status') {
    await showStatus(options.json);
  } else if (command === 'submit') {
    await submitPrompt(agent, options.prompt);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${basename(process.argv[1] ?? 'opsly-agent-cli')}: ${message}`);
  process.exitCode = 1;
});
