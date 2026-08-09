#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import {
  assignAgentTask,
  OrchestratorAgentTaskClient,
  type AgentTaskEnvelopeV1,
} from '@intcloudsysops/agent-task-core';

const repoRoot = resolve(new URL('..', import.meta.url).pathname);

type Options = {
  task?: string;
  tenant: string;
  taskType?: string;
  requestedAgent?: string;
  skills: string[];
  openSourceOnly: boolean;
  enqueue: boolean;
  autoStart: boolean;
  json: boolean;
};

function usage(): void {
  console.log(`Usage:
  node scripts/assign-agent-task.mjs --task "..." --tenant academy-demo
  node scripts/assign-agent-task.mjs --task "..." --tenant academy-demo --enqueue

Dry-run is default. --enqueue explicitly submits to Orchestrator local-agents.
--enqueue auto-starts the selected local bridge; use --no-auto-start when managed elsewhere.`);
}

function parseArgs(argv: string[]): Options & { help?: boolean } {
  const options: Options = {
    tenant: 'local',
    skills: [],
    openSourceOnly: false,
    enqueue: false,
    autoStart: true,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--help') return { ...options, help: true };
    if (arg === '--task' || arg === '--tenant' || arg === '--type' || arg === '--agent' || arg === '--skill') {
      if (!next) throw new Error(`${arg} requires a value`);
      if (arg === '--task') options.task = next;
      if (arg === '--tenant') options.tenant = next;
      if (arg === '--type') options.taskType = next;
      if (arg === '--agent') options.requestedAgent = next;
      if (arg === '--skill') options.skills.push(next);
      i += 1;
    } else if (arg === '--open-source-only') options.openSourceOnly = true;
    else if (arg === '--enqueue') options.enqueue = true;
    else if (arg === '--no-auto-start') options.autoStart = false;
    else if (arg === '--json') options.json = true;
    else throw new Error(`unknown option ${arg}`);
  }
  return options;
}

function autoStart(envelope: AgentTaskEnvelopeV1): void {
  if (!envelope.selected_agent.startsWith('local_')) return;
  const result = spawnSync('npm', ['run', 'opsly:agent-cli', '--', 'start', envelope.selected_agent], {
    cwd: repoRoot,
    stdio: 'inherit',
    timeout: 30_000,
  });
  if (result.error || result.status !== 0) throw new Error(`could not auto-start ${envelope.selected_agent}`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return usage();
  if (!options.task?.trim()) throw new Error('--task is required');

  const assigned = await assignAgentTask({
    task: options.task,
    tenantSlug: options.tenant,
    taskType: options.taskType,
    requestedAgent: options.requestedAgent,
    openSourceOnly: options.openSourceOnly,
    skills: options.skills,
    executionMode: options.enqueue ? 'enqueue' : 'dry_run',
  });

  if (assigned.policy.decision === 'deny') throw new Error(`policy denied: ${assigned.policy.reasons.join(',')}`);
  if (assigned.policy.decision === 'require_approval') {
    throw new Error(`approval required: ${assigned.policy.reasons.join(',')}`);
  }
  if (options.enqueue && options.autoStart) autoStart(assigned.envelope);

  const result = await new OrchestratorAgentTaskClient().enqueue(assigned.envelope);
  const output = {
    ...assigned,
    result,
    auto_started: Boolean(options.enqueue && options.autoStart),
  };
  console.log(options.json ? JSON.stringify(output, null, 2) : JSON.stringify(output, null, 2));
}

main().catch((error: unknown) => {
  console.error(`assign-agent-task: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
