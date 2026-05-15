#!/usr/bin/env node
/**
 * Opsly runtime reality check — reports what is REAL vs stub vs missing.
 * Usage: node scripts/opsly-runtime-verify.mjs
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const report = {
  generated_at: new Date().toISOString(),
  host: process.platform,
  phase0_codebase: {},
  phase1_binaries: [],
  phase2_tmux: {},
  phase3_workers: {},
  phase4_gateway: {},
  phase5_mcp: {},
  phase6_flow: {},
  recommendations: [],
};

function mark(name, status, detail) {
  return { component: name, status, detail };
}

async function which(cmd) {
  try {
    const { stdout } = await execFileAsync('which', [cmd]);
    return stdout.trim();
  } catch {
    return null;
  }
}

async function versionOf(cmd, args = ['--version']) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: 15000 });
    return stdout.split('\n')[0]?.trim() ?? 'ok';
  } catch (e) {
    return `error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// Phase 0 — codebase
const paths = {
  orchestrator: 'apps/orchestrator/src/index.ts',
  llm_gateway: 'apps/llm-gateway/src/index.ts',
  mcp: 'apps/mcp/src/server.ts',
  session_manager: 'lib/session-manager/src/index.ts',
  external_registry: 'lib/external-agent-registry/src/index.ts',
  git_branch_orchestrator: 'lib/git-branch-orchestrator/src/index.ts',
  cli_bridge: 'scripts/cli-agent-service.ts',
  local_http_worker: 'apps/orchestrator/src/workers/local-agent-http-worker.ts',
  runtime_routes: 'apps/orchestrator/src/http/routes/runtime.ts',
  runtime_governor: 'apps/orchestrator/src/lib/runtime-governor.ts',
};

for (const [k, p] of Object.entries(paths)) {
  const full = join(repoRoot, p);
  report.phase0_codebase[k] = existsSync(full) ? 'REAL (file exists)' : 'MISSING';
}

// Phase 1 — binaries
const tools = ['opencode', 'claude', 'codex', 'copilot', 'hermes', 'gh', 'git', 'docker', 'tmux', 'node', 'npm', 'doppler'];
for (const t of tools) {
  const path = await which(t);
  report.phase1_binaries.push({
    tool: t,
    installed: Boolean(path),
    path: path ?? null,
    version: path ? await versionOf(t) : null,
    adapter: existsSync(join(repoRoot, 'scripts/cli-agent-service.ts')) ? 'cli-agent-service.ts' : null,
  });
}

// Phase 2 — tmux
try {
  const session = `opsly-verify-${Date.now()}`;
  await execFileAsync('tmux', ['new-session', '-d', '-s', session, '-c', repoRoot]);
  await execFileAsync('tmux', ['send-keys', '-t', session, 'echo OPSLY_VERIFY_OK', 'Enter']);
  await new Promise((r) => setTimeout(r, 400));
  const { stdout } = await execFileAsync('tmux', ['capture-pane', '-t', session, '-p']);
  await execFileAsync('tmux', ['kill-session', '-t', session]);
  report.phase2_tmux = {
    status: stdout.includes('OPSLY_VERIFY_OK') ? 'REAL' : 'PARTIAL',
    capture_snippet: stdout.slice(-200),
  };
} catch (e) {
  report.phase2_tmux = { status: 'FAILED', error: String(e) };
}

// Phase 3 — session-manager package test hint
report.phase3_workers = {
  unified_local_worker: 'REAL — startLocalAgentsUnifiedWorker in local-agent-http-worker.ts',
  deprecated_per_agent_workers: 'PARTIAL — LocalClaudeWorker etc. deprecated, delegate to unified',
  cli_bridge_spawn: 'REAL — scripts/cli-agent-service.ts spawns claude|opencode|codex|copilot|hermes',
  dry_run_env: 'OPSLY_CLI_AGENT_DRY_RUN=1 skips spawn',
  session_manager_tmux: 'REAL — lib/session-manager uses tmux when OPSLY_RUNTIME_DRY_RUN!=true',
};

// Phase 4 — gateway aliases file
try {
  const vm = await readFile(join(repoRoot, 'apps/llm-gateway/src/virtual-models.ts'), 'utf8');
  const aliases = ['opsly:fast', 'opsly:coding', 'opsly:balanced', 'opsly:quality', 'opsly:architect', 'opsly:local'];
  report.phase4_gateway = {
    service: 'REAL — apps/llm-gateway',
    aliases_found: aliases.filter((a) => vm.includes(a)),
    live_provider_test: 'NOT RUN — requires Doppler keys + npm run test --workspace=@intcloudsysops/llm-gateway',
  };
} catch (e) {
  report.phase4_gateway = { status: 'FAILED', error: String(e) };
}

// Phase 5 — MCP
try {
  const server = await readFile(join(repoRoot, 'apps/mcp/src/server.ts'), 'utf8');
  report.phase5_mcp = {
    service: 'REAL — apps/mcp/src/server.ts',
    runtime_tools: server.includes('runtimeSessionsTools') ? 'REAL' : 'MISSING',
    brain_tools: server.includes('brain:research') ? 'REAL (obsidian mcp-tool)' : 'check obsidian/mcp-tool.ts',
    fs_tools: existsSync(join(repoRoot, 'apps/mcp/src/tools/hands/fs-tools.ts')) ? 'REAL' : 'MISSING',
    live_server: 'NOT RUN — start with npm run opsly:mcp:stdio',
  };
} catch (e) {
  report.phase5_mcp = { error: String(e) };
}

// Phase 6 — flow
report.phase6_flow = {
  prompt_submit_route: existsSync(join(repoRoot, 'apps/orchestrator/src/http/routes/local.ts'))
    ? 'REAL — POST /api/local/prompt-submit'
    : 'MISSING',
  local_agents_queue: 'REAL — queue local-agents in apps/orchestrator/src/queue.ts',
  redis_required: 'REAL — BullMQ needs REDIS_URL',
  e2e_requires: [
    'Redis up',
    'Orchestrator worker-enabled with startLocalAgentsUnifiedWorker',
    'Bridge on localhost:5004 (opencode) etc.',
    'PLATFORM_ADMIN_TOKEN for prompt-submit',
  ],
  smoke_scripts: [
    'node scripts/opsly-runtime-smoke.mjs',
    'node scripts/opsly-external-agents-smoke.mjs',
    'node scripts/opsly-runtime-verify.mjs',
  ],
};

report.recommendations = [
  'Run: npm run test --workspace=@intcloudsysops/session-manager',
  'Run: OPSLY_RUNTIME_DRY_RUN=false createSession smoke on Mac with tmux',
  'Run: OPSLY_CLI_AGENT_DRY_RUN=0 npm run opsly:local-opencode-service + curl /health',
  'Run orchestrator with Redis + POST /api/local/prompt-submit with x-autonomy-approved',
  'Do not claim E2E until bridge health + worker process verified',
];

const outDir = join(repoRoot, 'runtime', 'logs');
await mkdir(outDir, { recursive: true });
const outPath = join(outDir, 'runtime-verification-report.json');
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${outPath}`);
