#!/usr/bin/env npx tsx

import express from 'express';
import { spawn } from 'node:child_process';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { guardLlmTextPrompt } from '@intcloudsysops/prompt-guard';

type ExecuteRequest = {
  job_id?: string;
  prompt_content?: string;
  prompt?: string;
  agent_role?: string;
  max_steps?: number;
  model?: string;
};

type CommandSpec = {
  command: string;
  args: string[];
};

const repoRoot = process.cwd();
const app = express();
app.use(express.json({ limit: '1mb' }));

const agent = process.env.OPSLY_CLI_AGENT?.trim().toLowerCase() || 'codex';
const port = Number.parseInt(process.env.PORT || defaultPortFor(agent), 10);
const timeoutMs = positiveInteger(process.env.OPSLY_CLI_AGENT_TIMEOUT_MS, 300000);
const outputLimitBytes = positiveInteger(process.env.OPSLY_CLI_AGENT_OUTPUT_LIMIT_BYTES, 120000);
const allowedRoot = resolve(process.env.OPSLY_CLI_AGENT_ALLOWED_CWD_PREFIX || repoRoot);
const cwd = resolve(process.env.OPSLY_CLI_AGENT_CWD || repoRoot);
const dryRun = process.env.OPSLY_CLI_AGENT_DRY_RUN === '1';
const executeToken = process.env.OPSLY_CLI_AGENT_TOKEN || '';
const bindHost = process.env.OPSLY_CLI_AGENT_BIND?.trim() || '127.0.0.1';
let inFlightJobId: string | null = null;

function ensureCliAgentPath(): void {
  const extras = [join(homedir(), '.npm-global', 'bin'), join(homedir(), '.local', 'bin')].filter(
    (dir) => existsSync(dir),
  );
  const parts = (process.env.PATH || '').split(':').filter(Boolean);
  process.env.PATH = [...extras.filter((dir) => !parts.includes(dir)), ...parts].join(':');
}

ensureCliAgentPath();

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function defaultPortFor(name: string): string {
  const ports: Record<string, string> = {
    claude: '5002',
    copilot: '5003',
    opencode: '5004',
    codex: '5005',
    openai: '5006',
    hermes: '5007',
    decepticon: '5008',
    aider: '5009',
    goose: '5010',
    playwright: '5011',
  };
  return ports[name] || '5099';
}

function buildPrompt(body: ExecuteRequest): string {
  const jobId = body.job_id || randomUUID();
  const role = body.agent_role || agent;
  const maxSteps = body.max_steps ?? 8;
  const content = body.prompt_content || body.prompt || '';

  return [
    `You are Opsly local agent "${agent}" running as role "${role}".`,
    `Job ID: ${jobId}`,
    `Max steps: ${maxSteps}`,
    '',
    'Follow AGENTS.md and the repo guardrails. Return a concise execution report.',
    '',
    content,
  ].join('\n');
}

function promptContent(body: ExecuteRequest): string {
  return body.prompt_content || body.prompt || '';
}

function commandFor(prompt: string, body: ExecuteRequest): CommandSpec {
  const override = process.env.OPSLY_CLI_AGENT_COMMAND?.trim();
  if (override) {
    if (process.env.OPSLY_CLI_AGENT_ALLOW_COMMAND_OVERRIDE !== '1') {
      throw new Error('OPSLY_CLI_AGENT_COMMAND is disabled unless OPSLY_CLI_AGENT_ALLOW_COMMAND_OVERRIDE=1');
    }
    return { command: override, args: [] };
  }

  const modelArgs = body.model ? ['--model', body.model] : [];

  switch (agent) {
    case 'claude':
      return {
        command: 'claude',
        args: ['-p', prompt, '--permission-mode', process.env.CLAUDE_PERMISSION_MODE || 'plan'],
      };
    case 'copilot':
      return {
        command: 'copilot',
        args: [
          '-C',
          cwd,
          '-p',
          prompt,
          '--no-ask-user',
          '--output-format',
          'text',
          ...(process.env.OPSLY_COPILOT_ALLOW_ALL === '1' ? ['--allow-all'] : []),
        ],
      };
    case 'opencode':
      return {
        command: 'opencode',
        args: [
          'run',
          '--dir',
          cwd,
          '--agent',
          process.env.OPENCODE_AGENT || 'build',
          ...(process.env.OPSLY_OPENCODE_SKIP_PERMISSIONS === '1'
            ? ['--dangerously-skip-permissions']
            : []),
          ...modelArgs,
          prompt,
        ],
      };
    case 'hermes':
      return {
        command: 'hermes',
        args: [
          'chat',
          '-q',
          prompt,
          '-Q',
          '--source',
          'opsly-local-agent',
          '--max-turns',
          String(body.max_steps ?? process.env.HERMES_MAX_TURNS ?? 8),
          ...(body.model ? ['-m', body.model] : []),
        ],
      };
    case 'openai':
    case 'codex':
      return {
        command: 'codex',
        args: [
          'exec',
          '-C',
          cwd,
          '--sandbox',
          process.env.CODEX_SANDBOX || 'workspace-write',
          ...modelArgs,
          prompt,
        ],
      };
    case 'decepticon':
      return {
        command: 'codex',
        args: [
          'exec',
          '-C',
          cwd,
          '--sandbox',
          'read-only',
          'Run an adversarial security and correctness review only. Do not edit files.\n\n' + prompt,
        ],
      };
    case 'aider':
      return {
        command: 'aider',
        args: [
          '--message',
          prompt,
          '--yes',
          '--no-auto-commits',
          '--no-dirty-commits',
          ...(body.model ? ['--model', body.model] : []),
        ],
      };
    case 'goose':
      return {
        command: 'goose',
        args: [
          'run',
          '--no-session',
          '--with-builtin',
          process.env.GOOSE_BUILTIN || 'developer',
          '--max-turns',
          String(body.max_steps ?? process.env.GOOSE_MAX_TURNS ?? 8),
          ...(body.model ? ['--model', body.model] : []),
          '--text',
          prompt,
        ],
      };
    case 'playwright':
      return {
        command: 'npm',
        args: [
          'run',
          'test:e2e',
          '--workspace=@intcloudsysops/portal',
          '--',
          '--reporter=line',
        ],
      };
    default:
      throw new Error(`Unsupported OPSLY_CLI_AGENT: ${agent}`);
  }
}

function isPathInside(parent: string, child: string): boolean {
  const normalizedParent = parent.endsWith('/') ? parent : `${parent}/`;
  return child === parent || child.startsWith(normalizedParent);
}

function validateWorkspaceScope(): void {
  if (!existsSync(cwd)) {
    throw new Error(`Working directory does not exist: ${cwd}`);
  }
  if (!isPathInside(allowedRoot, cwd)) {
    throw new Error(`Working directory is outside allowed root: ${cwd}`);
  }
}

function safeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isAuthorized(req: express.Request): boolean {
  if (!executeToken) return true;
  const authHeader = req.header('authorization') || '';
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || '';
  return bearer.length > 0 && safeEquals(bearer, executeToken);
}

function buildChildEnv(): NodeJS.ProcessEnv {
  const baseAllowlist = [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'TMPDIR',
    'TEMP',
    'TMP',
    'TERM',
    'LANG',
    'LC_ALL',
    'XDG_CONFIG_HOME',
    'XDG_CACHE_HOME',
    'CODEX_HOME',
    'CLAUDE_CONFIG_DIR',
    'OPENCODE_CONFIG',
    'GOOSE_CONFIG_DIR',
    'HERMES_HOME',
    'NODE_OPTIONS',
  ];
  const extraAllowlist = (process.env.OPSLY_CLI_AGENT_ENV_ALLOWLIST || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowlist = new Set([...baseAllowlist, ...extraAllowlist]);
  const env: NodeJS.ProcessEnv = {};

  for (const key of allowlist) {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key];
    }
  }

  return env;
}

function redact(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-***')
    .replace(/nvapi-[A-Za-z0-9_-]{12,}/g, 'nvapi-***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/(api[_-]?key|token|password)=([^\s]+)/gi, '$1=***');
}

function appendLimited(current: string, chunk: Buffer): string {
  const next = current + chunk.toString();
  if (Buffer.byteLength(next, 'utf8') <= outputLimitBytes) {
    return next;
  }

  const truncated = Buffer.from(next).subarray(0, outputLimitBytes).toString('utf8');
  return `${truncated}\n[opsly] output truncated at ${outputLimitBytes} bytes`;
}

function runCommand(spec: CommandSpec): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise, reject) => {
    validateWorkspaceScope();

    const child = spawn(spec.command, spec.args, {
      cwd,
      detached: true,
      env: buildChildEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      if (child.pid) {
        process.kill(-child.pid, 'SIGTERM');
        setTimeout(() => {
          try {
            if (child.pid) process.kill(-child.pid, 'SIGKILL');
          } catch {
            // Process already exited.
          }
        }, 5000).unref();
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = appendLimited(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = appendLimited(stderr, chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new Error(`Agent ${agent} timed out after ${timeoutMs}ms`));
        return;
      }
      resolvePromise({ stdout: redact(stdout), stderr: redact(stderr), code });
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'cli-agent-service',
    agent,
    dry_run: dryRun,
    cwd,
    allowed_root: allowedRoot,
    auth_required: Boolean(executeToken),
    in_flight_job_id: inFlightJobId,
    output_limit_bytes: outputLimitBytes,
    timeout_ms: timeoutMs,
  });
});

app.post('/execute', async (req, res) => {
  const started = Date.now();
  const body = req.body as ExecuteRequest;
  const jobId = body.job_id || randomUUID();

  try {
    if (!isAuthorized(req)) {
      res.status(401).json({ success: false, job_id: jobId, error: 'unauthorized' });
      return;
    }

    if (inFlightJobId) {
      res.status(429).json({
        success: false,
        job_id: jobId,
        error: `agent ${agent} is busy`,
        in_flight_job_id: inFlightJobId,
      });
      return;
    }

    if (!promptContent(body).trim()) {
      res.status(400).json({ success: false, job_id: jobId, error: 'prompt_content is required' });
      return;
    }

    const guarded = guardLlmTextPrompt(promptContent(body));
    if (!guarded.ok) {
      res.status(guarded.status).json({ success: false, job_id: jobId, error: guarded.error });
      return;
    }

    const prompt = buildPrompt({ ...body, job_id: jobId, prompt_content: guarded.prompt });

    if (dryRun) {
      res.json({
        success: true,
        job_id: jobId,
        response_content: `# ${agent} dry-run\n\nReceived ${prompt.length} characters.`,
        execution_time_ms: Date.now() - started,
        model: body.model || agent,
      });
      return;
    }

    inFlightJobId = jobId;
    const spec = commandFor(prompt, body);
    const result = await runCommand(spec);
    const content = result.stdout.trim() || result.stderr.trim();

    res.status(result.code === 0 ? 200 : 500).json({
      success: result.code === 0,
      job_id: jobId,
      response_content: content,
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.code,
      execution_time_ms: Date.now() - started,
      model: body.model || agent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      job_id: jobId,
      error: redact(error instanceof Error ? error.message : String(error)),
      execution_time_ms: Date.now() - started,
    });
  } finally {
    if (inFlightJobId === jobId) {
      inFlightJobId = null;
    }
  }
});

app.listen(port, bindHost, () => {
  console.log(`[${agent}] CLI agent service listening on http://${bindHost}:${port}`);
  console.log(`[${agent}] cwd=${cwd}`);
  console.log(`[${agent}] dryRun=${dryRun}`);
});
