/**
 * Encola un squad de agentes Ollama directo en BullMQ (cola `openclaw`), sin endpoint HTTP.
 *
 * Uso:
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npx tsx scripts/enqueue-ollama-squad.ts \
 *     --tenant smiletripcare \
 *     --goal "Subir throughput y bajar costo"
 *
 * Flags:
 *   --tenant <slug>                 requerido
 *   --goal <texto>                  requerido
 *   --profile <core|production>     default: production
 *   --plan <startup|business|enterprise> default: startup
 *   --run-id <id>                   default: YYYYMMDDHH (UTC)
 */

import { randomUUID } from 'node:crypto';
import { Queue, type JobsOptions } from 'bullmq';

type Plan = 'startup' | 'business' | 'enterprise';
type Profile = 'core' | 'production';
type AgentRole = 'planner' | 'executor' | 'tool' | 'notifier';
type TaskType = 'analyze' | 'generate' | 'review' | 'summarize';

interface SquadJobSpec {
  persona: string;
  agentRole: AgentRole;
  taskType: TaskType;
  prompt: string;
}

interface OrchestratorJob {
  type: 'ollama';
  payload: {
    task_type: TaskType;
    prompt: string;
  };
  initiated_by: 'system';
  tenant_slug: string;
  request_id: string;
  plan: Plan;
  idempotency_key: string;
  agent_role: AgentRole;
  metadata: {
    agent: 'ollama_local';
    persona: string;
    profile: Profile;
    run_id: string;
    goal: string;
  };
}

function parseArgs(argv: string[]): {
  tenant: string;
  goal: string;
  profile: Profile;
  plan: Plan;
  runId: string;
} {
  let tenant = '';
  let goal = '';
  let profile: Profile = 'production';
  let plan: Plan = 'startup';
  let runId = new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '');

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tenant') {
      tenant = argv[i + 1] ?? '';
      i++;
      continue;
    }
    if (a === '--goal') {
      goal = argv[i + 1] ?? '';
      i++;
      continue;
    }
    if (a === '--profile') {
      const p = argv[i + 1];
      if (p === 'core' || p === 'production') {
        profile = p;
      }
      i++;
      continue;
    }
    if (a === '--plan') {
      const p = argv[i + 1];
      if (p === 'startup' || p === 'business' || p === 'enterprise') {
        plan = p;
      }
      i++;
      continue;
    }
    if (a === '--run-id') {
      runId = (argv[i + 1] ?? '').trim();
      i++;
      continue;
    }
  }

  if (tenant.trim().length === 0) {
    throw new Error('Missing required --tenant <slug>');
  }
  if (goal.trim().length === 0) {
    throw new Error('Missing required --goal <text>');
  }
  if (runId.length === 0) {
    throw new Error('Invalid --run-id');
  }

  return { tenant, goal, profile, plan, runId };
}

function redisConnectionFromEnv(): { host: string; port: number; password?: string } {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw) {
    throw new Error('REDIS_URL is required');
  }
  const parsed = new URL(raw);
  const pwdFromUrl = parsed.password ? decodeURIComponent(parsed.password) : '';
  return {
    host: parsed.hostname,
    port: Number(parsed.port || '6379'),
    password: process.env.REDIS_PASSWORD || pwdFromUrl || undefined,
  };
}

function buildSpecs(goal: string, profile: Profile): SquadJobSpec[] {
  const core: SquadJobSpec[] = [
    {
      persona: 'planner',
      agentRole: 'planner',
      taskType: 'analyze',
      prompt: `Eres Planner local en Ollama. Objetivo: ${goal}. Entrega plan en 5 pasos maximos, riesgos y siguiente accion concreta.`,
    },
    {
      persona: 'executor',
      agentRole: 'executor',
      taskType: 'generate',
      prompt: `Eres Executor local en Ollama. Ejecuta el objetivo: ${goal}. Devuelve resultado accionable y checklist de validacion.`,
    },
    {
      persona: 'notifier',
      agentRole: 'notifier',
      taskType: 'summarize',
      prompt: `Eres Notifier local en Ollama. Resume el estado para operaciones: ${goal}. Incluye resumen corto, riesgos y recomendacion.`,
    },
  ];
  if (profile === 'core') {
    return core;
  }
  return [
    ...core,
    {
      persona: 'reviewer',
      agentRole: 'tool',
      taskType: 'review',
      prompt: `Eres Reviewer local en Ollama. Revisa el output del executor para ${goal}. Detecta huecos, riesgos y mejoras concretas.`,
    },
    {
      persona: 'sre_guard',
      agentRole: 'tool',
      taskType: 'analyze',
      prompt: `Eres SRE Guard local en Ollama. Para ${goal}, propon runbook corto, alertas y checks de salud minimos.`,
    },
    {
      persona: 'cost_optimizer',
      agentRole: 'tool',
      taskType: 'analyze',
      prompt: `Eres Cost Optimizer local en Ollama. Para ${goal}, identifica 5 optimizaciones de costo con impacto y prioridad.`,
    },
    {
      persona: 'growth_operator',
      agentRole: 'tool',
      taskType: 'generate',
      prompt: `Eres Growth Operator local en Ollama. Para ${goal}, sugiere 3 experimentos de crecimiento medibles con KPI.`,
    },
  ];
}

function queuePriority(plan: Plan): number {
  if (plan === 'enterprise') return 0;
  if (plan === 'business') return 10000;
  return 50000;
}

async function main(): Promise<void> {
  const { tenant, goal, profile, plan, runId } = parseArgs(process.argv);
  const connection = redisConnectionFromEnv();
  const queue = new Queue('openclaw', { connection });
  const requestPrefix = `ollama-local-${tenant}-${runId}`;
  const specs = buildSpecs(goal, profile);
  const optsBase: JobsOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    priority: queuePriority(plan),
  };

  process.stdout.write(
    `Enqueuing Ollama squad tenant=${tenant} profile=${profile} plan=${plan} run_id=${runId}\n`
  );

  for (const spec of specs) {
    const requestId = `${requestPrefix}-${spec.persona}-${randomUUID().slice(0, 8)}`;
    const idem = `ollama-local:${tenant}:${runId}:${spec.persona}`;
    const job: OrchestratorJob = {
      type: 'ollama',
      payload: {
        task_type: spec.taskType,
        prompt: spec.prompt,
      },
      initiated_by: 'system',
      tenant_slug: tenant,
      request_id: requestId,
      plan,
      idempotency_key: idem,
      agent_role: spec.agentRole,
      metadata: {
        agent: 'ollama_local',
        persona: spec.persona,
        profile,
        run_id: runId,
        goal,
      },
    };
    const jobId = `idem-ollama-${idem}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
    const queued = await queue.add(job.type, job, { ...optsBase, jobId });
    process.stdout.write(
      `queued persona=${spec.persona} bullmq_id=${String(queued.id ?? '')} request_id=${requestId}\n`
    );
  }

  await queue.close();
  process.stdout.write('done\n');
}

void main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`ERROR: ${message}\n`);
  process.exitCode = 1;
});
