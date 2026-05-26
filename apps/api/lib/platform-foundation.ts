import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, type RedisClientType } from 'redis';

import { getOpenClawMissionControlSnapshot } from './admin-mission-control-openclaw';

type JsonObject = Record<string, unknown>;

export type HealthSignal = 'up' | 'down' | 'unknown';
export type ReadinessSignal = 'ready' | 'blocked' | 'unknown';
export type OperationalStatus = 'healthy' | 'degraded' | 'blocked' | 'unknown';

export type TenantLifecycleStageId =
  | 'incubated_tenant'
  | 'mvp_validation'
  | 'operational_stabilization'
  | 'dedicated_vps'
  | 'independent_platform'
  | 'connected_client_platform';

export interface TenantLifecycleStage {
  id: TenantLifecycleStageId;
  label: string;
  description: string;
}

export interface PlatformTenantRegistryEntry {
  slug: string;
  name: string;
  plan: string;
  owner_email: string | null;
  schema_name: string | null;
  platform_domain: string | null;
  workflows_count: number;
  status: string;
  lifecycle_stage: TenantLifecycleStageId;
  lifecycle_label: string;
  operational_status: OperationalStatus;
  extraction_ready: boolean;
  extraction_reason: string | null;
  deployment_readiness: ReadinessSignal;
  backup_ready: boolean;
  ssl_ready: boolean;
  uptime_ready: boolean;
  notes: string | null;
  source: string;
}

export interface PlatformAgentConnectivity {
  api_connectivity: HealthSignal;
  redis_connectivity: HealthSignal;
  llm_gateway_connectivity: HealthSignal;
  backup_readiness: ReadinessSignal;
  deployment_readiness: ReadinessSignal;
}

export interface PlatformAgentHeartbeat {
  last_seen_at: string | null;
  interval_seconds: number;
  stale_after_seconds: number;
  source: 'config' | 'runtime' | 'manual';
}

export interface PlatformAgentRegistryEntry {
  id: string;
  name: string;
  role: string;
  tenant_scope: 'global' | 'tenant-scoped';
  capabilities: string[];
  permissions: string[];
  enabled: boolean;
  approval_boundary: 'approval-first' | 'workflow-first' | 'read-only';
  health: {
    status: OperationalStatus;
    connectivity: PlatformAgentConnectivity;
  };
  heartbeat: PlatformAgentHeartbeat;
  model: string | null;
  fallback_model: string | null;
  url: string | null;
  specialization: string[];
}

export interface MissionControlReadModel {
  generated_at: string;
  vps: {
    host: string;
    status: OperationalStatus;
    api_connectivity: HealthSignal;
    orchestrator_connectivity: HealthSignal;
    llm_gateway_connectivity: HealthSignal;
    redis_connectivity: HealthSignal;
  };
  tenants: {
    total: number;
    by_stage: Record<TenantLifecycleStageId, number>;
    extraction_ready: number;
    items: PlatformTenantRegistryEntry[];
  };
  backups: {
    status: ReadinessSignal;
    policy: string;
    ready_tenants: number;
    last_success_at: string | null;
  };
  ssl: {
    status: ReadinessSignal;
    wildcard_domain: string;
    ready_tenants: number;
  };
  workflows: {
    status: ReadinessSignal;
    total: number;
    bootstrap_ready: number;
  };
  uptime: {
    status: ReadinessSignal;
    services: Array<{ name: string; status: HealthSignal; url: string | null }>;
  };
  ai_agents: {
    total: number;
    healthy: number;
    degraded: number;
    blocked: number;
    items: PlatformAgentRegistryEntry[];
  };
  pending_approvals: {
    count: number;
    queues: Array<{ queue: string; waiting: number; active: number }>;
  };
  extraction_readiness: {
    ready: number;
    blocked: number;
    items: Array<{
      slug: string;
      stage: TenantLifecycleStageId;
      ready: boolean;
      reason: string | null;
    }>;
  };
  openclaw: Awaited<ReturnType<typeof getOpenClawMissionControlSnapshot>>;
}

interface TenantFileRow {
  tenant_name: string;
  tenant_slug: string;
  schema_name: string;
  platform_domain: string;
  workflows_count?: number;
  pricing_per_unit?: number;
  currency?: string;
  notes?: string;
}

interface OpslyTenantRow {
  slug: string;
  name: string;
  ownerEmail: string | null;
  plan: string;
  status: string;
  createdAt?: string;
}

interface AgentServiceRow {
  enabled: boolean;
  external_cli?: string;
  url?: string;
  envUrl?: string;
  type?: string;
  timeoutMs?: number;
  retries?: number;
  llmFallback?: string;
  description?: string;
}

interface AgentServicesConfig {
  services: Record<string, AgentServiceRow>;
}

interface AgentsTeamEntry {
  id: string;
  name: string;
  role: string;
  model: string | null;
  fallback_model: string | null;
  local_only: boolean;
  allowed_tools: string[];
  allowed_paths: string[];
  specialization?: string[];
  daily_budget_usd?: number;
  rate_limit?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
  };
  _registered_at?: string;
}

interface AgentsTeamConfig {
  agents: AgentsTeamEntry[];
  constraints?: {
    require_approval_for?: string[];
  };
}

interface PlatformFoundationConfig {
  version: number;
  updated_at: string;
  tenant_lifecycle: {
    stages: TenantLifecycleStage[];
    default_stage_by_status: Partial<Record<string, TenantLifecycleStageId>>;
  };
  agent_governance: {
    approval_boundary: 'approval-first';
    workflow_boundary: 'workflow-first';
    tenant_scoping: 'tenant-scoped';
    permissions_catalog: Array<{
      id: string;
      label: string;
      approval_required: boolean;
    }>;
  };
  mission_control_contract: {
    views: string[];
    recovery_posture: 'reversible';
    data_posture: 'read-only-first';
  };
}

interface PlatformConfig {
  domains?: {
    base?: string;
    wildcard?: string;
  };
  backups?: {
    cron?: string;
    retention_days?: number;
  };
  tenants?: OpslyTenantRow[];
}

const RUNTIME_FETCH_TIMEOUT_MS = 2000;

function getRepoRoot(): string {
  const override = process.env.OPSLY_REPO_ROOT?.trim();
  if (override) {
    return override;
  }
  let current = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(path.join(current, 'config', 'platform-foundation.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return process.cwd();
}

function resolveRepoPath(...segments: string[]): string {
  return path.join(getRepoRoot(), ...segments);
}

async function readJsonFile<T>(...segments: string[]): Promise<T> {
  const raw = await readFile(resolveRepoPath(...segments), 'utf8');
  return JSON.parse(raw) as T;
}

async function readJsonFileOrNull<T>(...segments: string[]): Promise<T | null> {
  try {
    return await readJsonFile<T>(...segments);
  } catch {
    return null;
  }
}

async function findTenantFiles(): Promise<TenantFileRow[]> {
  const dir = resolveRepoPath('config', 'tenants');
  const files = await readdir(dir, { withFileTypes: true });
  const rows: TenantFileRow[] = [];
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.json')) {
      continue;
    }
    if (file.name === 'schema.tenant-config.json' || file.name.startsWith('_template')) {
      continue;
    }
    const row = await readJsonFileOrNull<TenantFileRow>('config', 'tenants', file.name);
    if (row) {
      rows.push(row);
    }
  }
  return rows;
}

function toTitleCaseId(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readString(raw: unknown, fallback: string | null = null): string | null {
  return typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : fallback;
}

function readNumber(raw: unknown, fallback: number): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function deriveTenantStage(input: {
  plan: string;
  status: string;
  workflowsCount: number;
  foundation: PlatformFoundationConfig;
}): TenantLifecycleStageId {
  const normalizedStatus = input.status.toLowerCase();
  const override = input.foundation.tenant_lifecycle.default_stage_by_status[normalizedStatus];
  if (normalizedStatus === 'deleted') {
    return 'independent_platform';
  }
  if (input.plan === 'enterprise') {
    return 'independent_platform';
  }
  if (normalizedStatus !== 'active' && override) {
    return override;
  }
  if (normalizedStatus !== 'active') {
    return 'incubated_tenant';
  }
  if (input.workflowsCount >= 4) {
    return 'dedicated_vps';
  }
  if (input.workflowsCount >= 1) {
    return 'operational_stabilization';
  }
  return 'mvp_validation';
}

function deriveExtractionReadiness(tenant: {
  plan: string;
  status: string;
  workflowsCount: number;
  stage: TenantLifecycleStageId;
}): { ready: boolean; reason: string | null } {
  if (tenant.status.toLowerCase() !== 'active') {
    return { ready: false, reason: 'tenant is not active yet' };
  }
  if (tenant.plan === 'demo') {
    return { ready: false, reason: 'demo tenants are never extracted' };
  }
  if (
    tenant.workflowsCount >= 4 ||
    tenant.stage === 'dedicated_vps' ||
    tenant.stage === 'independent_platform'
  ) {
    return { ready: true, reason: 'workflow bundle and operational boundary are in place' };
  }
  return { ready: false, reason: 'more workflow coverage or operational stabilization required' };
}

function deriveDeploymentReadiness(input: {
  status: string;
  workflowsCount: number;
  extractionReady: boolean;
}): ReadinessSignal {
  if (input.status.toLowerCase() !== 'active') {
    return 'blocked';
  }
  if (input.extractionReady) {
    return 'ready';
  }
  if (input.workflowsCount >= 4) {
    return 'ready';
  }
  if (input.workflowsCount >= 1) {
    return 'ready';
  }
  return 'blocked';
}

function deriveOperationalStatus(input: {
  status: string;
  workflowsCount: number;
  extractionReady: boolean;
}): OperationalStatus {
  if (input.status.toLowerCase() !== 'active') {
    return 'blocked';
  }
  if (input.extractionReady || input.workflowsCount >= 1) {
    return 'healthy';
  }
  return 'degraded';
}

function normalizeTenantRow(
  fileRow: TenantFileRow,
  opslyRow: OpslyTenantRow | undefined,
  foundation: PlatformFoundationConfig,
  baseDomain: string
): PlatformTenantRegistryEntry {
  const plan = opslyRow?.plan ?? 'startup';
  const status = opslyRow?.status ?? 'active';
  const workflowsCount = readNumber(fileRow.workflows_count, 0);
  const stage = deriveTenantStage({ plan, status, workflowsCount, foundation });
  const extraction = deriveExtractionReadiness({ plan, status, workflowsCount, stage });
  const deploymentReadiness = deriveDeploymentReadiness({
    status,
    workflowsCount,
    extractionReady: extraction.ready,
  });
  const backupReady = status.toLowerCase() === 'active' && workflowsCount > 0;
  const sslReady = fileRow.platform_domain.endsWith(baseDomain);
  const uptimeReady = status.toLowerCase() === 'active';
  return {
    slug: fileRow.tenant_slug,
    name: fileRow.tenant_name,
    plan,
    owner_email: opslyRow?.ownerEmail ?? null,
    schema_name: readString(fileRow.schema_name),
    platform_domain: readString(fileRow.platform_domain),
    workflows_count: workflowsCount,
    status,
    lifecycle_stage: stage,
    lifecycle_label:
      foundation.tenant_lifecycle.stages.find((s) => s.id === stage)?.label ?? toTitleCaseId(stage),
    operational_status: deriveOperationalStatus({
      status,
      workflowsCount,
      extractionReady: extraction.ready,
    }),
    extraction_ready: extraction.ready,
    extraction_reason: extraction.reason,
    deployment_readiness: deploymentReadiness,
    backup_ready: backupReady,
    ssl_ready: sslReady,
    uptime_ready: uptimeReady,
    notes: readString(fileRow.notes),
    source: `config/tenants/${fileRow.tenant_slug}.json`,
  };
}

function permissionIdsForAgent(
  agent: AgentsTeamEntry,
  foundation: PlatformFoundationConfig
): string[] {
  const permissions = new Set<string>();
  permissions.add('mission_control.read');
  permissions.add('tenants.read');
  permissions.add('agents.read');
  permissions.add('agents.heartbeat');
  permissions.add('openclaw.monitor');
  if (!agent.local_only) {
    permissions.add('openclaw.route');
  }
  if (agent.allowed_tools.includes('shell-command')) {
    permissions.add('provisioning.execute');
  }
  if (agent.allowed_paths.some((p) => p.includes('apps/orchestrator') || p.includes('apps/api'))) {
    permissions.add('provisioning.read');
  }
  if (agent.allowed_paths.some((p) => p.includes('docs/') || p.includes('scripts/'))) {
    permissions.add('mission_control.read');
  }

  const catalog = foundation.agent_governance.permissions_catalog;
  return Array.from(permissions).filter((permission) =>
    catalog.some((item) => item.id === permission)
  );
}

function deriveAgentConnectivity(agent: AgentsTeamEntry): PlatformAgentConnectivity {
  const hasNetworkedRuntime = agent.local_only === false;
  return {
    api_connectivity: hasNetworkedRuntime ? 'unknown' : 'down',
    redis_connectivity: hasNetworkedRuntime ? 'unknown' : 'down',
    llm_gateway_connectivity: hasNetworkedRuntime ? 'unknown' : 'down',
    backup_readiness: hasNetworkedRuntime ? 'unknown' : 'blocked',
    deployment_readiness: hasNetworkedRuntime ? 'ready' : 'blocked',
  };
}

function deriveAgentStatus(agent: AgentsTeamEntry): OperationalStatus {
  return agent.local_only ? 'degraded' : 'healthy';
}

function normalizeAgentRows(
  agentsTeam: AgentsTeamConfig,
  servicesConfig: AgentServicesConfig,
  foundation: PlatformFoundationConfig
): PlatformAgentRegistryEntry[] {
  return agentsTeam.agents.map((agent) => {
    const service = servicesConfig.services[agent.id] ?? null;
    const lastSeen = agent._registered_at ?? null;
    const permissions = permissionIdsForAgent(agent, foundation);
    const capabilities = Array.from(
      new Set([
        ...agent.allowed_tools,
        ...agent.allowed_paths.map((p) => `path:${p}`),
        ...(agent.specialization ?? []).map((item) => `specialization:${item}`),
      ])
    );
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      tenant_scope: agent.allowed_paths.some(
        (p) => p.startsWith('apps/peskids') || p.includes('tenant')
      )
        ? 'tenant-scoped'
        : 'global',
      capabilities,
      permissions,
      enabled: Boolean(service?.enabled ?? true),
      approval_boundary: agent.local_only ? 'workflow-first' : 'approval-first',
      health: {
        status: deriveAgentStatus(agent),
        connectivity: deriveAgentConnectivity(agent),
      },
      heartbeat: {
        last_seen_at: lastSeen,
        interval_seconds: agent.rate_limit?.requests_per_minute
          ? Math.max(10, Math.floor(60 / agent.rate_limit.requests_per_minute))
          : 60,
        stale_after_seconds: 5 * 60,
        source: lastSeen ? 'config' : 'manual',
      },
      model: agent.model,
      fallback_model: agent.fallback_model,
      url: service?.url ?? null,
      specialization: agent.specialization ?? [],
    };
  });
}

async function createRedisClient(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL?.trim() || 'redis://localhost:6379';
  return createClient({
    url,
    password: process.env.REDIS_PASSWORD?.trim() || undefined,
  }) as RedisClientType;
}

async function pingRedis(): Promise<HealthSignal> {
  const client = await createRedisClient();
  try {
    await client.connect();
    await client.ping();
    return 'up';
  } catch {
    return 'unknown';
  } finally {
    if (client.isOpen) {
      await client.disconnect();
    }
  }
}

async function probeBaseUrl(baseUrl: string): Promise<HealthSignal> {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) {
    return 'unknown';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUNTIME_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${trimmed}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    return response.ok ? 'up' : 'down';
  } catch {
    return 'unknown';
  } finally {
    clearTimeout(timeout);
  }
}

function aggregateVpsStatus(signals: {
  orchestrator: HealthSignal;
  llmGateway: HealthSignal;
  redis: HealthSignal;
}): OperationalStatus {
  if ([signals.orchestrator, signals.llmGateway, signals.redis].includes('down')) {
    return 'blocked';
  }
  if ([signals.orchestrator, signals.llmGateway, signals.redis].includes('unknown')) {
    return 'degraded';
  }
  return 'healthy';
}

function aggregateReadiness(states: ReadinessSignal[]): ReadinessSignal {
  if (states.includes('blocked')) {
    return 'blocked';
  }
  if (states.includes('ready')) {
    return 'ready';
  }
  return 'unknown';
}

async function readFoundationConfig(): Promise<PlatformFoundationConfig> {
  return readJsonFile<PlatformFoundationConfig>('config', 'platform-foundation.json');
}

async function readOpslyConfig(): Promise<PlatformConfig> {
  return readJsonFile<PlatformConfig>('config', 'opsly.config.json');
}

async function buildTenantRegistry(): Promise<PlatformTenantRegistryEntry[]> {
  const [foundation, opslyConfig, tenantFiles] = await Promise.all([
    readFoundationConfig(),
    readOpslyConfig(),
    findTenantFiles(),
  ]);
  const baseDomain = opslyConfig.domains?.base ?? 'op-sly.com';
  const opslyTenants = new Map((opslyConfig.tenants ?? []).map((tenant) => [tenant.slug, tenant]));
  return tenantFiles.map((fileRow) =>
    normalizeTenantRow(fileRow, opslyTenants.get(fileRow.tenant_slug), foundation, baseDomain)
  );
}

async function buildAgentRegistry(): Promise<PlatformAgentRegistryEntry[]> {
  const [foundation, agentsTeam, servicesConfig] = await Promise.all([
    readFoundationConfig(),
    readJsonFile<AgentsTeamConfig>('config', 'agents-team.json'),
    readJsonFile<AgentServicesConfig>('config', 'agent-services.json'),
  ]);
  return normalizeAgentRows(agentsTeam, servicesConfig, foundation);
}

function summarizeByStage(
  items: PlatformTenantRegistryEntry[]
): Record<TenantLifecycleStageId, number> {
  const summary: Record<TenantLifecycleStageId, number> = {
    incubated_tenant: 0,
    mvp_validation: 0,
    operational_stabilization: 0,
    dedicated_vps: 0,
    independent_platform: 0,
    connected_client_platform: 0,
  };
  for (const item of items) {
    summary[item.lifecycle_stage] += 1;
  }
  return summary;
}

function summarizeAgentHealth(items: PlatformAgentRegistryEntry[]): {
  total: number;
  healthy: number;
  degraded: number;
  blocked: number;
} {
  let healthy = 0;
  let degraded = 0;
  let blocked = 0;
  for (const item of items) {
    if (item.health.status === 'healthy') {
      healthy += 1;
    } else if (item.health.status === 'blocked') {
      blocked += 1;
    } else {
      degraded += 1;
    }
  }
  return { total: items.length, healthy, degraded, blocked };
}

async function readApprovalGateQueue(): Promise<{ waiting: number; active: number }> {
  const client = await createRedisClient();
  try {
    await client.connect();
    const [waiting, active] = await Promise.all([
      client.lLen('bull:approval-gate:wait'),
      client.lLen('bull:approval-gate:active'),
    ]);
    return { waiting, active };
  } catch {
    return { waiting: 0, active: 0 };
  } finally {
    if (client.isOpen) {
      await client.disconnect();
    }
  }
}

export async function getPlatformTenantRegistry(): Promise<{
  stages: TenantLifecycleStage[];
  items: PlatformTenantRegistryEntry[];
  by_stage: Record<TenantLifecycleStageId, number>;
  extraction_ready: number;
}> {
  const [foundation, items] = await Promise.all([readFoundationConfig(), buildTenantRegistry()]);
  return {
    stages: foundation.tenant_lifecycle.stages,
    items,
    by_stage: summarizeByStage(items),
    extraction_ready: items.filter((item) => item.extraction_ready).length,
  };
}

export async function getPlatformAgentRegistry(): Promise<{
  items: PlatformAgentRegistryEntry[];
  summary: ReturnType<typeof summarizeAgentHealth>;
}> {
  const items = await buildAgentRegistry();
  return {
    items,
    summary: summarizeAgentHealth(items),
  };
}

export async function getMissionControlFoundationReadModel(): Promise<MissionControlReadModel> {
  const [
    tenantRegistry,
    agentRegistry,
    openclaw,
    opslyConfig,
    orchestratorHealth,
    llmHealth,
    redisHealth,
    approvalQueue,
  ] = await Promise.all([
    getPlatformTenantRegistry(),
    getPlatformAgentRegistry(),
    getOpenClawMissionControlSnapshot(),
    readOpslyConfig(),
    probeBaseUrl(process.env.ORCHESTRATOR_INTERNAL_URL?.trim() ?? 'http://orchestrator:3011'),
    probeBaseUrl(
      process.env.MCP_LLM_GATEWAY_URL?.trim() ??
        process.env.LLM_GATEWAY_INTERNAL_URL?.trim() ??
        process.env.ORCHESTRATOR_LLM_GATEWAY_URL?.trim() ??
        process.env.LLM_GATEWAY_URL?.trim() ??
        'http://llm-gateway:3010'
    ),
    pingRedis(),
    readApprovalGateQueue(),
  ]);

  const apiConnectivity: HealthSignal = 'up';
  const vpsStatus = aggregateVpsStatus({
    orchestrator: orchestratorHealth,
    llmGateway: llmHealth,
    redis: redisHealth,
  });

  const backupsReady = tenantRegistry.items.filter((item) => item.backup_ready).length;
  const sslReady = tenantRegistry.items.filter((item) => item.ssl_ready).length;
  const workflowsReady = tenantRegistry.items.filter((item) => item.workflows_count > 0).length;
  const extractionItems = tenantRegistry.items.map((item) => ({
    slug: item.slug,
    stage: item.lifecycle_stage,
    ready: item.extraction_ready,
    reason: item.extraction_reason,
  }));

  const agentSummary = agentRegistry.summary;

  return {
    generated_at: new Date().toISOString(),
    vps: {
      host: process.env.OPSLY_VPS_HOST?.trim() ?? 'vps-dragon',
      status: vpsStatus,
      api_connectivity: apiConnectivity,
      orchestrator_connectivity: orchestratorHealth,
      llm_gateway_connectivity: llmHealth,
      redis_connectivity: redisHealth,
    },
    tenants: {
      total: tenantRegistry.items.length,
      by_stage: tenantRegistry.by_stage,
      extraction_ready: tenantRegistry.extraction_ready,
      items: tenantRegistry.items,
    },
    backups: {
      status: aggregateReadiness([
        backupsReady > 0 ? 'ready' : 'blocked',
        readString(opslyConfig.backups?.cron) ? 'ready' : 'blocked',
      ]),
      policy: `cron=${opslyConfig.backups?.cron ?? 'unknown'} retention=${opslyConfig.backups?.retention_days ?? 'unknown'}d`,
      ready_tenants: backupsReady,
      last_success_at: null,
    },
    ssl: {
      status: aggregateReadiness([sslReady > 0 ? 'ready' : 'blocked']),
      wildcard_domain: opslyConfig.domains?.wildcard ?? '*.op-sly.com',
      ready_tenants: sslReady,
    },
    workflows: {
      status: aggregateReadiness([workflowsReady > 0 ? 'ready' : 'blocked']),
      total: tenantRegistry.items.reduce((sum, tenant) => sum + tenant.workflows_count, 0),
      bootstrap_ready: workflowsReady,
    },
    uptime: {
      status: aggregateReadiness([vpsStatus === 'healthy' ? 'ready' : 'blocked']),
      services: [
        { name: 'api', status: apiConnectivity, url: null },
        {
          name: 'orchestrator',
          status: orchestratorHealth,
          url: process.env.ORCHESTRATOR_INTERNAL_URL?.trim() ?? 'http://orchestrator:3011',
        },
        {
          name: 'llm-gateway',
          status: llmHealth,
          url:
            process.env.MCP_LLM_GATEWAY_URL?.trim() ??
            process.env.LLM_GATEWAY_INTERNAL_URL?.trim() ??
            process.env.ORCHESTRATOR_LLM_GATEWAY_URL?.trim() ??
            process.env.LLM_GATEWAY_URL?.trim() ??
            'http://llm-gateway:3010',
        },
        {
          name: 'redis',
          status: redisHealth,
          url: process.env.REDIS_URL?.trim() ?? 'redis://localhost:6379',
        },
      ],
    },
    ai_agents: {
      total: agentSummary.total,
      healthy: agentSummary.healthy,
      degraded: agentSummary.degraded,
      blocked: agentSummary.blocked,
      items: agentRegistry.items,
    },
    pending_approvals: {
      count: approvalQueue.waiting + approvalQueue.active,
      queues: [
        {
          queue: 'approval-gate',
          waiting: approvalQueue.waiting,
          active: approvalQueue.active,
        },
      ],
    },
    extraction_readiness: {
      ready: tenantRegistry.extraction_ready,
      blocked: tenantRegistry.items.length - tenantRegistry.extraction_ready,
      items: extractionItems,
    },
    openclaw,
  };
}
