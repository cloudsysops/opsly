#!/usr/bin/env npx tsx

import express from 'express';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

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
const timeoutMs = Number.parseInt(process.env.OPSLY_CLI_AGENT_TIMEOUT_MS || '300000', 10);
const cwd = process.env.OPSLY_CLI_AGENT_CWD || repoRoot;
const dryRun = process.env.OPSLY_CLI_AGENT_DRY_RUN === '1';

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

function commandFor(prompt: string, body: ExecuteRequest): CommandSpec {
  const override = process.env.OPSLY_CLI_AGENT_COMMAND?.trim();
  if (override) {
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

function redact(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, 'sk-***')
    .replace(/nvapi-[A-Za-z0-9_-]{12,}/g, 'nvapi-***')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***')
    .replace(/(api[_-]?key|token|password)=([^\s]+)/gi, '$1=***');
}

function runCommand(spec: CommandSpec): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolvePromise, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`Working directory does not exist: ${cwd}`));
      return;
    }

    const child = spawn(spec.command, spec.args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Agent ${agent} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
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
  });
});

app.post('/execute', async (req, res) => {
  const started = Date.now();
  const body = req.body as ExecuteRequest;
  const jobId = body.job_id || randomUUID();
  const prompt = buildPrompt({ ...body, job_id: jobId });

  try {
    if (!prompt.trim()) {
      res.status(400).json({ success: false, job_id: jobId, error: 'prompt_content is required' });
      return;
    }

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
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`[${agent}] CLI agent service listening on http://127.0.0.1:${port}`);
  console.log(`[${agent}] cwd=${cwd}`);
  console.log(`[${agent}] dryRun=${dryRun}`);
});
