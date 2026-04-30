import { Worker, type Job } from 'bullmq';
import { connection } from '../queue.js';
import { processIntent } from '../engine.js';
import type { IntentRequest, OrchestratorJob } from '../types.js';

export interface AgentFarmPayload {
  role: 'dev-api' | 'dev-ui' | 'devops';
  task: string;
  max_steps?: number;
  tenant_slug: string;
}

/**
 * AgentFarmWorker: procesa jobs de tipo `agent_farm`.
 * Lanza instancias OAR ReAct con herramientas de desarrollo.
 * Gestiona concurrencia para no saturar el LLM Gateway.
 */
export function startAgentFarmWorker() {
  const worker = new Worker('openclaw', handleAgentFarmJob, {
    connection,
    concurrency: 2,
  });

  worker.on('completed', (job: Job) => {
    console.log(`✅ Agent farm job completed: ${job.id}`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (!job) return;
    console.error(`❌ Agent farm job failed: ${job.id}`, err.message);
  });

  return worker;
}

async function handleAgentFarmJob(job: Job<OrchestratorJob>): Promise<{
  ok: boolean;
  result?: unknown;
  error?: string;
  steps: number;
  cost_usd: number;
}> {
  const { payload, tenant_slug, request_id } = job.data;
  if (!payload || typeof payload !== 'object') {
    return {
      ok: false,
      error: 'Invalid payload',
      steps: 0,
      cost_usd: 0,
    };
  }
  const farmPayload = payload as unknown as AgentFarmPayload;

  const { role, task, max_steps = 30, tenant_slug: farm_tenant } = farmPayload;
  const actualTenant = tenant_slug || farm_tenant || 'opsly-internal';

  try {
    console.log(
      `[AgentFarm] Starting ${role} agent for: ${task.slice(0, 60)}... (max_steps: ${max_steps})`
    );

    // Construir el prompt para el agente ReAct
    const systemPrompt = `
You are a specialized developer agent working on the Opsly platform.
Your role: ${getRoleDescription(role)}

Available tools: run_tests, type_check, git_command, backlog_reader, fs_read_file, fs_write_file

Task: ${task}

Instructions:
1. Understand the task clearly
2. Use tools to gather information (read files, check status)
3. Implement the solution
4. Run tests to verify
5. Commit changes to git with a clear message

Max steps: ${max_steps}. Be efficient and avoid loops.
`;

    const intentRequest: IntentRequest = {
      intent: 'oar_react',
      context: {
        prompt: systemPrompt,
        query: task,
        max_steps,
      },
      tenant_slug: actualTenant,
      initiated_by: 'system',
      request_id,
      agent_role: 'executor',
      metadata: {
        agent_farm_role: role,
        task_description: task.slice(0, 100),
      },
    };
    const result = await processIntent(intentRequest, { invokedFromIntentDispatchWorker: true });

    return {
      ok: true,
      result,
      steps: result.oar?.steps_executed ?? 0,
      cost_usd: 0,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[AgentFarm] Error in ${role} agent:`, error);

    return {
      ok: false,
      error,
      steps: 0,
      cost_usd: 0,
    };
  }
}

function getRoleDescription(role: string): string {
  switch (role) {
    case 'dev-api':
      return 'Backend API development. You work in apps/api directory. Write TypeScript, create routes, tests, migrations.';
    case 'dev-ui':
      return 'Frontend development. You work in apps/portal and apps/admin. Write React, TypeScript, styles using Tailwind.';
    case 'devops':
      return 'DevOps and infrastructure. You work with Docker, bash scripts, VPS configuration, monitoring.';
    default:
      return 'Generic developer agent.';
  }
}
