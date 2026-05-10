#!/usr/bin/env node

/**
 * LocalPromptWatcher
 *
 * Watches `.cursor/prompts/queue/*.md`, submits pending prompts to the
 * orchestrator local-agents queue, polls for completion, and appends the
 * required "Respuesta agente" section to the same prompt file.
 *
 * Safety: prompt Markdown is never executed as shell. It is submitted as agent
 * input through `/api/local/prompt-submit`; shell execution still happens only
 * through the normal agent/tool permission model.
 *
 * Usage:
 *   PLATFORM_ADMIN_TOKEN=... npm run opsly:local-prompt-watcher
 *   npx tsx scripts/local-prompt-watcher.ts --once
 *
 * Environment variables:
 *   CURSOR_DIR - .cursor directory path (default: .cursor)
 *   PROMPT_QUEUE_DIR - prompt queue directory (default: .cursor/prompts/queue)
 *   ACTIVE_PROMPT_PATH - active prompt context file (default: docs/01-development/ACTIVE-PROMPT.md)
 *   ORCHESTRATOR_URL - Orchestrator health server URL (default: http://localhost:3011)
 *   PLATFORM_ADMIN_TOKEN - Token for authentication (required)
 */

import { promises as fsp } from 'fs';
import * as path from 'path';
import { watch, type FSWatcher } from 'chokidar';

type PromptStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'done';
type AgentJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';

interface PromptMetadata {
  jobId: string;
  filePath: string;
  filename: string;
  submittedAt: string;
  completedAt?: string;
  status: AgentJobStatus;
  agent: string;
  agentRole: string;
  error?: string;
}

interface WatcherState {
  [filename: string]: PromptMetadata;
}

interface FrontmatterData {
  id?: string;
  status?: PromptStatus;
  agent?: string;
  agent_role?: string;
  max_steps?: number;
  goal?: string;
  priority?: number;
  requires_pr?: boolean;
  autonomy_approved?: boolean;
}

interface PromptSubmitResponse {
  ok?: boolean;
  job_id?: string;
  jobId?: string;
  request_id?: string;
}

interface JobStatusResponse {
  id?: string;
  job_id?: string;
  status?: string;
  state?: string;
  result?: unknown;
  output?: unknown;
  response?: unknown;
  error?: unknown;
}

interface WatcherOptions {
  cursorDir: string;
  queueDir: string;
  activePromptPath: string;
  orchestratorUrl: string;
  adminToken: string;
  once: boolean;
  pollIntervalMs: number;
  pollAttempts: number;
}

const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_POLL_ATTEMPTS = 450;
const RESPONSE_MARKER = '## Respuesta agente';

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', '0'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseCliValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function hasCliFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeStatus(raw: string | undefined): AgentJobStatus {
  const status = raw?.toLowerCase();
  if (status === 'completed' || status === 'done' || status === 'success') {
    return 'completed';
  }
  if (status === 'failed' || status === 'error') {
    return 'failed';
  }
  if (status === 'processing' || status === 'active' || status === 'running') {
    return 'processing';
  }
  if (status === 'pending' || status === 'queued' || status === 'waiting') {
    return 'pending';
  }
  return 'unknown';
}

function renderUnknown(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function decommentMarkdownPrompt(content: string): string {
  return content
    .split('\n')
    .map((line) => line.replace(/^#\s?/, ''))
    .join('\n')
    .trim();
}

class LocalPromptWatcher {
  private readonly cursorDir: string;
  private readonly queueDir: string;
  private readonly activePromptPath: string;
  private readonly orchestratorUrl: string;
  private readonly adminToken: string;
  private readonly metadataFile: string;
  private readonly once: boolean;
  private readonly pollIntervalMs: number;
  private readonly pollAttempts: number;
  private readonly inFlight = new Set<string>();
  private state: WatcherState = {};
  private watcher: FSWatcher | undefined;

  constructor(options: WatcherOptions) {
    this.cursorDir = options.cursorDir;
    this.queueDir = options.queueDir;
    this.activePromptPath = options.activePromptPath;
    this.orchestratorUrl = options.orchestratorUrl.replace(/\/$/, '');
    this.adminToken = options.adminToken;
    this.once = options.once;
    this.pollIntervalMs = options.pollIntervalMs;
    this.pollAttempts = options.pollAttempts;
    this.metadataFile = path.join(this.queueDir, '.metadata.json');
  }

  private parseFrontmatter(content: string): { frontmatter: FrontmatterData; body: string } {
    const lines = content.split('\n');
    const frontmatter: FrontmatterData = {};
    let bodyStart = 0;

    if (lines[0]?.trim() === '---') {
      let fmEnd = 1;
      while (fmEnd < lines.length && lines[fmEnd]?.trim() !== '---') {
        const line = lines[fmEnd] ?? '';
        const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (match) {
          const key = match[1];
          const value = parseScalar(match[2] ?? '');
          if (key === 'max_steps' || key === 'priority') {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed)) {
              (frontmatter as Record<string, number>)[key] = parsed;
            }
          } else if (key === 'requires_pr' || key === 'autonomy_approved') {
            (frontmatter as Record<string, boolean | undefined>)[key] = parseBoolean(value);
          } else {
            (frontmatter as Record<string, string>)[key] = value;
          }
        }
        fmEnd += 1;
      }
      bodyStart = fmEnd + 1;
    }

    return {
      frontmatter,
      body: lines.slice(bodyStart).join('\n').trim(),
    };
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fsp.readFile(this.metadataFile, 'utf-8');
      this.state = JSON.parse(data) as WatcherState;
      console.log(`[LocalPromptWatcher] Loaded metadata: ${Object.keys(this.state).length} entries`);
    } catch {
      this.state = {};
    }
  }

  private async saveState(): Promise<void> {
    await fsp.writeFile(this.metadataFile, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  private async readActivePromptContext(): Promise<string> {
    try {
      const content = await fsp.readFile(this.activePromptPath, 'utf-8');
      return decommentMarkdownPrompt(content);
    } catch {
      return '';
    }
  }

  private buildAgentPrompt(activePrompt: string, body: string): string {
    const parts = [
      'Sigue las reglas del repo y ejecuta esta tarea como agente Opsly.',
      activePrompt.length > 0
        ? `Contexto operativo ACTIVE-PROMPT:\n\n${activePrompt}`
        : 'Contexto operativo ACTIVE-PROMPT no disponible.',
      `Tarea detectada en cola:\n\n${body}`,
      'Al terminar, produce un resumen verificable con archivos modificados, validaciones y bloqueos.',
    ];
    return parts.join('\n\n---\n\n');
  }

  private shouldSkipPrompt(filename: string, content: string, frontmatter: FrontmatterData): boolean {
    if (filename.endsWith('.response.md') || filename === 'README.md') {
      return true;
    }
    if (content.includes(RESPONSE_MARKER)) {
      return true;
    }
    return frontmatter.status !== undefined && frontmatter.status !== 'pending';
  }

  private async updatePromptStatus(filePath: string, status: PromptStatus): Promise<void> {
    const content = await fsp.readFile(filePath, 'utf-8');
    if (!content.startsWith('---\n')) {
      return;
    }
    const lines = content.split('\n');
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (end < 0) {
      return;
    }
    const next = [...lines];
    const statusIndex = next.slice(1, end).findIndex((line) => /^status:\s*/.test(line));
    if (statusIndex >= 0) {
      next[statusIndex + 1] = `status: ${status}`;
    } else {
      next.splice(end, 0, `status: ${status}`);
    }
    await fsp.writeFile(filePath, next.join('\n'), 'utf-8');
  }

  private buildResponseSection(params: {
    status: 'hecho' | 'parcial' | 'bloqueado';
    jobId: string;
    agent: string;
    agentRole: string;
    jobStatus: JobStatusResponse | null;
    error?: string;
  }): string {
    const now = new Date().toISOString();
    const output = params.jobStatus
      ? renderUnknown(params.jobStatus.result ?? params.jobStatus.output ?? params.jobStatus.response)
      : '';
    const details = output.length > 0 ? output : params.error ?? 'Sin salida detallada del orchestrator.';

    return [
      '',
      '---',
      '',
      `## Respuesta agente (${now})`,
      '',
      `- **Estado:** ${params.status}`,
      `- **Job:** ${params.jobId}`,
      `- **Agente:** ${params.agent}`,
      `- **Rol:** ${params.agentRole}`,
      '- **Rama / PR:** pendiente de commit/PR si hubo cambios',
      '- **Commits:** pendiente',
      '- **Qué se hizo:** prompt enviado al orchestrator local y procesado por la cola `local-agents`.',
      `- **Resultado:** ${details.replace(/\n/g, '\n  ')}`,
      '- **Cómo verificar:** revisar `.cursor/prompts/queue/.metadata.json`, logs del orchestrator y `.cursor/responses/` si el servicio local generó artefactos.',
      '',
    ].join('\n');
  }

  private async appendAgentResponse(
    filePath: string,
    responseSection: string,
    finalStatus: PromptStatus,
  ): Promise<void> {
    const current = await fsp.readFile(filePath, 'utf-8');
    if (!current.includes(RESPONSE_MARKER)) {
      await fsp.writeFile(filePath, `${current.trimEnd()}\n${responseSection}`, 'utf-8');
    }
    await this.updatePromptStatus(filePath, finalStatus);
  }

  private async submitPrompt(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    if (this.inFlight.has(filename)) {
      return;
    }
    this.inFlight.add(filename);

    try {
      const content = await fsp.readFile(filePath, 'utf-8');
      const { frontmatter, body } = this.parseFrontmatter(content);
      if (this.shouldSkipPrompt(filename, content, frontmatter)) {
        return;
      }

      await this.updatePromptStatus(filePath, 'processing');

      const activePrompt = await this.readActivePromptContext();
      const agent = frontmatter.agent?.trim() || 'cursor';
      const agentRole = frontmatter.agent_role?.trim() || 'executor';
      const maxSteps = frontmatter.max_steps ?? 10;
      const requestId = (frontmatter.id ?? filename.replace(/\.md$/, '')).replace(/[^a-zA-Z0-9_-]/g, '-');
      const promptBody = this.buildAgentPrompt(activePrompt, body);

      console.log(`[LocalPromptWatcher] Submitting ${filename} (agent: ${agent}, role: ${agentRole})`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.adminToken}`,
      };
      if (frontmatter.autonomy_approved === true) {
        headers['x-autonomy-approved'] = 'true';
      }
      const response = await fetch(`${this.orchestratorUrl}/api/local/prompt-submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt_path: filePath,
          prompt_body: promptBody,
          agent,
          agent_role: agentRole,
          max_steps: maxSteps,
          goal: frontmatter.goal ?? `Execute ${filename}`,
          request_id: requestId,
          priority: frontmatter.priority,
          context: {
            active_prompt_path: this.activePromptPath,
            queue_file: filePath,
            requires_pr: frontmatter.requires_pr ?? false,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`prompt-submit HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const result = (await response.json()) as PromptSubmitResponse;
      const jobId = result.job_id ?? result.jobId ?? result.request_id ?? requestId;
      this.state[filename] = {
        jobId,
        filePath,
        filename,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        agent,
        agentRole,
      };
      await this.saveState();

      const jobStatus = await this.pollJob(jobId);
      const normalized = normalizeStatus(jobStatus?.status ?? jobStatus?.state);
      const completed = normalized === 'completed';
      const failed = normalized === 'failed';

      this.state[filename] = {
        ...this.state[filename],
        status: completed ? 'completed' : failed ? 'failed' : 'unknown',
        completedAt: new Date().toISOString(),
      };
      await this.saveState();

      await this.appendAgentResponse(
        filePath,
        this.buildResponseSection({
          status: completed ? 'hecho' : failed ? 'bloqueado' : 'parcial',
          jobId,
          agent,
          agentRole,
          jobStatus,
          error: failed ? renderUnknown(jobStatus?.error) : undefined,
        }),
        completed ? 'done' : failed ? 'failed' : 'pending',
      );

      console.log(`[LocalPromptWatcher] ${filename} → ${completed ? 'completed' : normalized}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[LocalPromptWatcher] Failed ${filename}: ${errorMsg}`);
      this.state[filename] = {
        jobId: '',
        filePath,
        filename,
        submittedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'failed',
        agent: 'unknown',
        agentRole: 'unknown',
        error: errorMsg,
      };
      await this.saveState();
      await this.appendAgentResponse(
        filePath,
        this.buildResponseSection({
          status: 'bloqueado',
          jobId: 'not-submitted',
          agent: 'unknown',
          agentRole: 'unknown',
          jobStatus: null,
          error: errorMsg,
        }),
        'failed',
      ).catch(() => undefined);
    } finally {
      this.inFlight.delete(filename);
    }
  }

  private async pollJob(jobId: string): Promise<JobStatusResponse | null> {
    for (let attempt = 1; attempt <= this.pollAttempts; attempt += 1) {
      const response = await fetch(`${this.orchestratorUrl}/api/job-status/${encodeURIComponent(jobId)}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
      });
      if (response.ok) {
        const status = (await response.json()) as JobStatusResponse;
        const normalized = normalizeStatus(status.status ?? status.state);
        if (normalized === 'completed' || normalized === 'failed') {
          return status;
        }
      }
      await sleep(this.pollIntervalMs);
    }
    return { id: jobId, status: 'unknown', error: 'Timed out waiting for job completion' };
  }

  private async processExistingQueue(): Promise<void> {
    const entries = await fsp.readdir(this.queueDir, { withFileTypes: true });
    const promptFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.join(this.queueDir, entry.name))
      .sort();

    for (const filePath of promptFiles) {
      await this.submitPrompt(filePath);
    }
  }

  async start(): Promise<void> {
    await fsp.mkdir(this.queueDir, { recursive: true });
    await fsp.mkdir(path.join(this.cursorDir, 'responses'), { recursive: true });
    await this.loadState();
    await this.processExistingQueue();

    if (this.once) {
      return;
    }

    console.log(`[LocalPromptWatcher] Watching ${this.queueDir}`);
    console.log(`[LocalPromptWatcher] Active prompt context: ${this.activePromptPath}`);
    console.log(`[LocalPromptWatcher] Orchestrator: ${this.orchestratorUrl}`);

    this.watcher = watch(path.join(this.queueDir, '*.md'), {
      persistent: true,
      ignoreInitial: true,
      ignored: ['**/.*', '**/*.response.md'],
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath: string) => {
      void this.submitPrompt(filePath);
    });
    this.watcher.on('change', (filePath: string) => {
      void this.submitPrompt(filePath);
    });
    this.watcher.on('error', (err: unknown) => {
      console.error('[LocalPromptWatcher] Watcher error:', err);
    });
  }

  async stop(): Promise<void> {
    await this.watcher?.close();
  }
}

async function main(): Promise<void> {
  const cursorDir = parseCliValue('cursor-dir') ?? process.env.CURSOR_DIR ?? '.cursor';
  const queueDir =
    parseCliValue('queue-dir') ??
    process.env.PROMPT_QUEUE_DIR ??
    path.join(cursorDir, 'prompts', 'queue');
  const activePromptPath =
    parseCliValue('active-prompt') ??
    process.env.ACTIVE_PROMPT_PATH ??
    'docs/01-development/ACTIVE-PROMPT.md';
  const orchestratorUrl =
    parseCliValue('orchestrator-url') ?? process.env.ORCHESTRATOR_URL ?? 'http://localhost:3011';
  const adminToken = process.env.PLATFORM_ADMIN_TOKEN ?? '';
  const once = hasCliFlag('once') || process.env.PROMPT_WATCHER_ONCE === 'true';

  if (!adminToken) {
    console.error('[LocalPromptWatcher] ERROR: PLATFORM_ADMIN_TOKEN not set in environment');
    process.exit(1);
  }

  const watcher = new LocalPromptWatcher({
    cursorDir,
    queueDir,
    activePromptPath,
    orchestratorUrl,
    adminToken,
    once,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    pollAttempts: DEFAULT_POLL_ATTEMPTS,
  });

  await watcher.start();

  process.on('SIGINT', () => {
    void watcher.stop().finally(() => process.exit(0));
  });
  process.on('SIGTERM', () => {
    void watcher.stop().finally(() => process.exit(0));
  });
}

void main().catch((err) => {
  console.error('[LocalPromptWatcher] Fatal error:', err);
  process.exit(1);
});
