#!/usr/bin/env node
import { createHiveRedisClient } from './redis.js';

interface CliArgs {
  objective: string;
  taskId: string;
  subtaskId: string;
  action: 'objective' | 'status' | 'retry';
  monitor: boolean;
  tenantSlug: string;
  endpoint: string;
  adminToken: string;
}

function parseArgs(argv: string[]): CliArgs {
  let objective = '';
  let taskId = '';
  let subtaskId = '';
  let action: CliArgs['action'] = 'objective';
  let monitor = false;
  let tenantSlug = process.env.HIVE_TENANT_SLUG?.trim() || '';
  const endpoint = process.env.ORCHESTRATOR_INTERNAL_URL?.trim() || 'http://localhost:3011';
  const adminToken = process.env.PLATFORM_ADMIN_TOKEN?.trim() || '';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--objective' || arg === '-o') {
      objective = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--tenant' || arg === '-t') {
      tenantSlug = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--monitor') {
      monitor = true;
      continue;
    }
    if (arg === '--status' || arg === '--task') {
      action = 'status';
      taskId = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--retry') {
      action = 'retry';
      taskId = argv[i + 1] ?? '';
      subtaskId = argv[i + 2] ?? '';
      i += 2;
      continue;
    }
  }

  return {
    objective: objective.trim(),
    taskId: taskId.trim(),
    subtaskId: subtaskId.trim(),
    action,
    monitor,
    tenantSlug: tenantSlug.trim(),
    endpoint,
    adminToken,
  };
}

function printUsage(): void {
  process.stdout.write(`Usage:
  npm run hive-run --workspace=@intcloudsysops/orchestrator -- --objective "..." --tenant <slug> [--monitor]
  npm run hive-run --workspace=@intcloudsysops/orchestrator -- --status <taskId>
  npm run hive-run --workspace=@intcloudsysops/orchestrator -- --retry <taskId> <subtaskId>
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.action === 'objective' && (args.objective.length === 0 || args.tenantSlug.length === 0)) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (args.action === 'status' && args.taskId.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (args.action === 'retry' && (args.taskId.length === 0 || args.subtaskId.length === 0)) {
    printUsage();
    process.exitCode = 1;
    return;
  }
  if (args.adminToken.length === 0) {
    throw new Error('PLATFORM_ADMIN_TOKEN is required');
  }

  if (args.action === 'status') {
    const response = await fetch(`${args.endpoint}/internal/hive/task/${encodeURIComponent(args.taskId)}`, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${args.adminToken}`,
      },
    });
    if (!response.ok) {
      throw new Error(`hive status failed: ${response.status} ${await response.text()}`);
    }
    process.stdout.write(`${await response.text()}\n`);
    return;
  }

  if (args.action === 'retry') {
    const response = await fetch(
      `${args.endpoint}/internal/hive/task/${encodeURIComponent(args.taskId)}/retry/${encodeURIComponent(args.subtaskId)}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${args.adminToken}`,
        },
      }
    );
    if (!response.ok) {
      throw new Error(`hive retry failed: ${response.status} ${await response.text()}`);
    }
    process.stdout.write(`${await response.text()}\n`);
    return;
  }

  const response = await fetch(`${args.endpoint}/internal/hive/objective`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${args.adminToken}`,
    },
    body: JSON.stringify({
      objective: args.objective,
      tenant_slug: args.tenantSlug,
    }),
  });
  if (!response.ok) {
    throw new Error(`hive objective enqueue failed: ${response.status} ${await response.text()}`);
  }
  const result = (await response.json()) as { taskId?: string; request_id?: string };
  process.stdout.write(
    `${JSON.stringify({
      status: 'queued',
      taskId: result.taskId ?? null,
      request_id: result.request_id ?? null,
    })}\n`
  );

  if (!args.monitor) {
    return;
  }

  const redis = createHiveRedisClient();
  await redis.subscribe('hive:state_update');
  process.stdout.write('Monitoring hive:state_update...\n');
  redis.on('message', (_channel, message) => {
    try {
      const parsed = JSON.parse(message) as Record<string, unknown>;
      process.stdout.write(`${JSON.stringify({ event: 'hive_state_update', state: parsed })}\n`);
    } catch {
      process.stdout.write(`${JSON.stringify({ event: 'hive_state_update', raw: message })}\n`);
    }
  });
}

void main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
