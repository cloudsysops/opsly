import { randomUUID } from 'node:crypto';
import { PheromoneChannel } from './pheromone-channel.js';
import { HiveStateStore } from './hive-state.js';
import type { BotRole, HiveTask, Subtask } from './types.js';

const MAX_SUBTASK_RETRIES = 2;

export function inferBotRoleFromDescription(description: string): BotRole {
  const d = description.toLowerCase();
  if (d.includes('test') || d.includes('spec')) {
    return 'tester';
  }
  if (d.includes('deploy') || d.includes('release')) {
    return 'deployer';
  }
  if (d.includes('document') || d.includes('readme')) {
    return 'doc-writer';
  }
  if (d.includes('security') || d.includes('vulnerab')) {
    return 'security';
  }
  if (d.includes('research') || d.includes('investiga')) {
    return 'researcher';
  }
  return 'coder';
}

export class QueenBee {
  private readonly hiveState: HiveStateStore;
  private readonly pheromones: PheromoneChannel;
  private subscribed = false;

  constructor() {
    this.hiveState = new HiveStateStore();
    this.pheromones = new PheromoneChannel();
  }

  async start(): Promise<void> {
    if (this.subscribed) {
      return;
    }
    await this.pheromones.subscribe('queen', ['task_complete', 'error'], (message) => {
      void this.handlePheromone(message);
    });
    this.subscribed = true;
  }

  private decomposeObjective(objective: string, hiveTaskId: string): Subtask[] {
    const baseParts = objective
      .split(/\n|;|\.(?=\s+[A-ZÁÉÍÓÚÑa-záéíóúñ])/g)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const parts = baseParts.length > 0 ? baseParts : [objective.trim()];
    return parts.map((description, index) => ({
      id: `${hiveTaskId}-subtask-${index + 1}`,
      taskId: hiveTaskId,
      parentTaskId: hiveTaskId,
      description,
      assignedBotRole: inferBotRoleFromDescription(description),
      status: 'pending' as const,
      dependencies: index === 0 ? [] : [`${hiveTaskId}-subtask-${index}`],
      createdAt: new Date(),
    }));
  }

  private pickAvailableBotId(
    role: BotRole,
    bots: Record<string, { role: BotRole; status: string }>
  ): string | undefined {
    const chosen = Object.entries(bots).find(
      ([, b]) => b.role === role && b.status === 'idle'
    );
    return chosen?.[0];
  }

  private async assignSubtask(
    hiveTask: HiveTask,
    subtask: Subtask,
    _tenantSlug: string
  ): Promise<void> {
    const snapshot = await this.hiveState.getState();
    const role = subtask.assignedBotRole ?? 'coder';
    const botId = this.pickAvailableBotId(role, snapshot.bots);
    
    if (!botId) {
      await this.pheromones.publish({
        from: 'queen',
        to: 'broadcast',
        type: 'request_help',
        content: `Need available ${role} bot for subtask ${subtask.id}`,
        timestamp: new Date(),
        metadata: { taskId: hiveTask.id, subtaskId: subtask.id },
      });
      return;
    }

    await this.pheromones.publish({
      id: randomUUID(),
      senderId: 'queen',
      recipientId: botId,
      type: 'subtask_assignment',
      payload: subtask,
      timestamp: new Date(),
      metadata: { taskId: hiveTask.id },
    });

    await this.hiveState.updateTask(hiveTask.id, {
      subtasks: hiveTask.subtasks.map((s) =>
        s.id === subtask.id ? { ...s, status: 'assigned', assignedBotId: botId } : s
      ),
      status: 'in_progress',
    });
  }

  private async assignReadySubtasks(hiveTask: HiveTask, tenantSlug: string): Promise<void> {
    const completed = new Set(
      hiveTask.subtasks.filter((s) => s.status === 'completed').map((s) => s.id)
    );

    for (const subtask of hiveTask.subtasks) {
      if (subtask.status === 'pending') {
        const canStart =
          subtask.dependencies.length === 0 ||
          subtask.dependencies.every((dep) => completed.has(dep));

        if (canStart) {
          await this.assignSubtask(hiveTask, subtask, tenantSlug);
        }
      }
    }
  }

  private async handlePheromone(message: { type: string; payload?: unknown }): Promise<void> {
    const payload = (message.payload ?? {}) as Record<string, unknown>;
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
    const subtaskId = typeof payload.subtaskId === 'string' ? payload.subtaskId : '';
    if (taskId.length === 0 || subtaskId.length === 0) {
      return;
    }
    const hiveTask = await this.hiveState.getTask(taskId);
    if (!hiveTask) {
      return;
    }

    if (message.type === 'task_complete') {
      const subtasks = hiveTask.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, status: 'completed' as const, completedAt: new Date() } : s
      );
      const allDone = subtasks.every((s) => s.status === 'completed');
      await this.hiveState.updateTask(hiveTask.id, {
        subtasks,
        status: allDone ? 'completed' : 'in_progress',
        completedAt: allDone ? new Date() : undefined,
      });
      if (!allDone) {
        const refreshed = await this.hiveState.getTask(hiveTask.id);
        if (refreshed) {
          await this.assignReadySubtasks(refreshed, 'opsly-internal');
        }
      }
      return;
    }

    if (message.type === 'error') {
      const subtask = hiveTask.subtasks.find((s) => s.id === subtaskId);
      if (!subtask) {
        return;
      }
      const retries =
        typeof subtask.result === 'object' && subtask.result !== null
          ? Number((subtask.result as Record<string, unknown>).retryCount ?? 0)
          : 0;
      const nextRetryCount = retries + 1;
      if (nextRetryCount <= MAX_SUBTASK_RETRIES) {
        const subtasks = hiveTask.subtasks.map((s) =>
          s.id === subtaskId
            ? {
                ...s,
                status: 'pending' as const,
                assignedBotId: undefined,
                result: { retryCount: nextRetryCount, lastError: payload.error ?? 'unknown' },
              }
            : s
        );
        await this.hiveState.updateTask(hiveTask.id, { subtasks, status: 'in_progress' });
        const refreshed = await this.hiveState.getTask(hiveTask.id);
        if (refreshed) {
          const failedSubtask = refreshed.subtasks.find((s) => s.id === subtaskId);
          if (failedSubtask) {
            await this.assignSubtask(refreshed, failedSubtask, 'opsly-internal');
          }
        }
        return;
      }

      await this.hiveState.updateTask(hiveTask.id, {
        subtasks: hiveTask.subtasks.map((s) =>
          s.id === subtaskId
            ? { ...s, status: 'failed' as const, result: { retryCount: nextRetryCount } }
            : s
        ),
        status: 'failed',
      });
    }
  }

  async processObjective(req: {
    objective: string;
    priority?: string;
    assignedBotRoles?: BotRole[];
  }): Promise<HiveTask> {
    await this.start();
    const taskId = `task-${randomUUID()}`;
    const hiveTask: HiveTask = {
      id: taskId,
      objective: req.objective,
      subtasks: this.decomposeObjective(req.objective, taskId),
      status: 'in_progress',
      createdAt: new Date(),
    };

    await this.hiveState.addTask(hiveTask);
    console.log(`[QueenBee] Tarea ${taskId} creada con ${hiveTask.subtasks.length} subtareas`);

    await this.assignReadySubtasks(hiveTask, 'opsly-internal');

    return hiveTask;
  }

  async close(): Promise<void> {
    await this.hiveState.close();
    await this.pheromones.close();
  }
}
