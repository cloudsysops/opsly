import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { enqueueJob } from '../queue.js';
import type { OrchestratorJob } from '../types.js';

interface PlannedTask {
  id: string;
  goal: string;
  instruction: string;
  priority: number;
  labels: string[];
}

interface SchedulerState {
  last_awake_time?: string;
  last_report_time?: string;
  last_planning?: string;
  active_goals?: string[];
  completed_tasks?: Array<Record<string, unknown>>;
  blocked_tasks?: Array<Record<string, unknown>>;
  next_action?: string;
  autonomous_metrics?: Record<string, number>;
  leads_generated?: number;
  projected_revenue?: number;
  conversion_rate?: number;
}

const DEFAULT_STATE: SchedulerState = {
  active_goals: [],
  completed_tasks: [],
  blocked_tasks: [],
  autonomous_metrics: {
    tasks_completed_this_week: 0,
    successful_prs: 0,
    failed_attempts: 0,
    cost_saved_usd: 0,
  },
  leads_generated: 0,
  projected_revenue: 0,
  conversion_rate: 0,
};

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export class AutonomousScheduler {
  private readonly statePath = resolve(process.cwd(), 'context/system_state.json');
  private readonly agentsPath = resolve(process.cwd(), 'AGENTS.md');
  private readonly visionPath = resolve(process.cwd(), 'VISION.md');
  private readonly planningHourUtc = parseNumberEnv('OPSLY_AUTONOMOUS_PLANNING_HOUR_UTC', 6);
  private readonly executionIntervalMs = parseNumberEnv(
    'OPSLY_AUTONOMOUS_EXECUTION_INTERVAL_HOURS',
    4
  ) * 60 * 60 * 1000;
  private readonly growthEnabled = process.env.OPSLY_AUTONOMOUS_GROWTH_ENABLED === 'true';
  private readonly tickEveryMs = parseNumberEnv('OPSLY_AUTONOMOUS_TICK_MINUTES', 5) * 60 * 1000;
  private lastPlanningDate = '';
  private lastExecutionRunAt = 0;
  private timer: NodeJS.Timeout | null = null;
  private runningTick = false;

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.runTick();
    }, this.tickEveryMs);
    this.timer.unref();
    void this.runTick();
    console.log('[orchestrator] AutonomousScheduler enabled');
  }

  stop(): void {
    if (!this.timer) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  private async runTick(): Promise<void> {
    if (this.runningTick) {
      return;
    }
    this.runningTick = true;
    try {
      await this.planIfDue();
      await this.executeIfDue();
    } catch (error) {
      console.error('[orchestrator] autonomous scheduler tick failed', error);
    } finally {
      this.runningTick = false;
    }
  }

  private async planIfDue(): Promise<void> {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getUTCHours() !== this.planningHourUtc || this.lastPlanningDate === today) {
      return;
    }
    const tasks = await this.planDailyTasks();
    this.lastPlanningDate = today;
    console.log(`[orchestrator] autonomous planning completed (${tasks.length} tasks)`);
  }

  private async executeIfDue(): Promise<void> {
    const now = Date.now();
    if (now - this.lastExecutionRunAt < this.executionIntervalMs) {
      return;
    }
    this.lastExecutionRunAt = now;
    await this.executeTasks();
  }

  private async loadState(): Promise<SchedulerState> {
    try {
      const data = await readFile(this.statePath, 'utf-8');
      const parsed = JSON.parse(data) as SchedulerState;
      return { ...DEFAULT_STATE, ...parsed };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  private async saveState(state: SchedulerState): Promise<void> {
    await writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
  }

  private async planDailyTasks(): Promise<PlannedTask[]> {
    const [agentsContent, visionContent, state] = await Promise.all([
      readFile(this.agentsPath, 'utf-8'),
      readFile(this.visionPath, 'utf-8'),
      this.loadState(),
    ]);

    const plannedTasks = await this.requestPlanFromGateway(agentsContent, visionContent, state);
    const nowIso = new Date().toISOString();
    for (const task of plannedTasks) {
      const job: OrchestratorJob = {
        type: 'intent_dispatch',
        initiated_by: 'cron',
        plan: 'startup',
        tenant_slug: 'platform',
        taskId: task.id,
        idempotency_key: `autonomous:${task.id}:${nowIso.slice(0, 10)}`,
        request_id: `autonomous-plan-${Date.now()}-${task.id}`,
        agent_role: 'planner',
        payload: {
          intent_request: {
            intent: 'oar_react',
            context: {
              prompt: task.instruction,
              goal: task.goal,
              source: 'autonomous_scheduler',
            },
            initiated_by: 'cron',
            tenant_slug: 'platform',
            plan: 'startup',
            taskId: task.id,
            agent_role: 'planner',
          },
        },
        metadata: {
          autonomous: true,
          planned_priority: task.priority,
          labels: task.labels ?? [],
          growth_critical: (task.labels ?? []).includes('growth-critical'),
        },
      };
      await enqueueJob(job);
    }

    state.last_awake_time = nowIso;
    state.last_planning = nowIso;
    state.active_goals = plannedTasks.map((task) => task.goal);
    state.next_action = plannedTasks[0]?.goal ?? state.next_action;
    state.autonomous_metrics = {
      ...DEFAULT_STATE.autonomous_metrics,
      ...(state.autonomous_metrics ?? {}),
    };
    await this.saveState(state);
    return plannedTasks;
  }

  private async executeTasks(): Promise<void> {
    const state = await this.loadState();
    state.last_awake_time = new Date().toISOString();
    await this.saveState(state);
    console.log('[orchestrator] autonomous execution heartbeat');
  }

  private async requestPlanFromGateway(
    agentsContent: string,
    visionContent: string,
    state: SchedulerState
  ): Promise<PlannedTask[]> {
    const gatewayUrl = process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? 'http://llm-gateway:3010';
    const maxChars = 4000;
    const prompt = [
      'Eres el planificador autonomo de Opsly.',
      'Devuelve JSON puro con la forma: {"tasks":[{"id":"t1","goal":"...","instruction":"...","priority":50}]}',
      'Maximo 3 tareas concretas, seguras y ejecutables hoy.',
      this.growthEnabled
        ? 'Debes incluir al menos 1 tarea growth-critical para adquisicion de clientes y contenido comercial.'
        : 'Evita tareas de growth comercial si no se habilita growth.',
      `AGENTS_SNIPPET:\n${agentsContent.slice(0, maxChars)}`,
      `VISION_SNIPPET:\n${visionContent.slice(0, maxChars)}`,
      `SYSTEM_STATE:\n${JSON.stringify(state)}`,
    ].join('\n\n');

    try {
      const response = await fetch(`${gatewayUrl}/v1/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.OPSLY_AUTONOMOUS_MODEL ?? 'claude-sonnet-4-20250514',
          tenant_slug: 'platform',
          plan: 'startup',
          prompt,
        }),
      });
      if (!response.ok) {
        throw new Error(`gateway ${response.status}`);
      }
      const payload = (await response.json()) as { text?: string };
      const tasks = this.parseTasksFromText(payload.text ?? '');
      if (tasks.length > 0) {
        return tasks;
      }
    } catch (error) {
      console.warn('[orchestrator] autonomous planner fallback', error);
    }

    const fallback: PlannedTask[] = [
      {
        id: `daily-${Date.now()}-health`,
        goal: 'Verificar salud de servicios core',
        instruction: 'Ejecuta chequeos de salud para api, orchestrator y llm-gateway y resume hallazgos.',
        priority: 50,
        labels: ['ops'],
      },
      {
        id: `daily-${Date.now()}-security`,
        goal: 'Revisar postura de seguridad operativa',
        instruction: 'Revisa bloqueantes de seguridad activos y propone accion concreta sin tocar secretos.',
        priority: 60,
        labels: ['security'],
      },
    ];
    if (this.growthEnabled) {
      fallback.unshift({
        id: `daily-${Date.now()}-growth`,
        goal: 'Generar un activo de adquisicion para agencias digitales',
        instruction:
          'Crear una propuesta de outreach etico + contenido de valor para agencias y registrarla en docs/outbound.',
        priority: 1,
        labels: ['growth-critical'],
      });
    }
    return fallback;
  }

  private parseTasksFromText(text: string): PlannedTask[] {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return [];
    }
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        tasks?: Array<Record<string, unknown>>;
      };
      if (!Array.isArray(parsed.tasks)) {
        return [];
      }
      return parsed.tasks
        .map((task, index) => {
          const goal = typeof task.goal === 'string' ? task.goal.trim() : '';
          const instruction =
            typeof task.instruction === 'string' ? task.instruction.trim() : goal;
          const idSource = typeof task.id === 'string' ? task.id.trim() : `task-${index + 1}`;
          const id = idSource.length > 0 ? idSource : `task-${index + 1}`;
          const priority =
            typeof task.priority === 'number' && Number.isFinite(task.priority)
              ? Math.max(0, Math.min(100, Math.floor(task.priority)))
              : 50;
          const labels = Array.isArray(task.labels)
            ? task.labels.filter((label): label is string => typeof label === 'string')
            : [];
          if (!goal || !instruction) {
            return null;
          }
          return { id, goal, instruction, priority, labels };
        })
        .filter((task): task is PlannedTask => task !== null)
        .slice(0, 3);
    } catch {
      return [];
    }
  }
}
