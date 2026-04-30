import { randomUUID } from 'node:crypto';
import { PheromoneChannel } from './pheromone-channel.js';
import { HiveStateStore } from './hive-state.js';
import type { BotRole, HiveTask, PheromoneMessage, Subtask } from './types.js';

const MAX_SUBTASK_RETRIES = 2;

export function inferBotRole(description: string): BotRole {
  const d = description.toLowerCase();
  if (d.includes('test') || d.includes('spec')) return 'tester';
  if (d.includes('deploy') || d.includes('release')) return 'deployer';
  if (d.includes('document') || d.includes('readme')) return 'doc-writer';
  if (d.includes('security') || d.includes('vulnerab')) return 'security';
  if (d.includes('research') || d.includes('investiga')) return 'researcher';
  return 'coder';
}

export function decomposeObjective(objective: string, hiveTaskId: string): Subtask[] {
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
    assignedBotRole: inferBotRole(description),
    status: 'pending',
    dependencies: index === 0 ? [] : [`${hiveTaskId}-subtask-${index}`],
    createdAt: new Date(),
  }));
}

export class QueenBee {
  private readonly hiveState = new HiveStateStore();
  private readonly pheromones = new PheromoneChannel();
  private subscribed = false;

  async start(): Promise<void> {
    if (this.subscribed) return;
    await this.pheromones.subscribe('queen', ['task_complete', 'error'], (message) => {
      void this.handlePheromone(message);
    });
    this.subscribed = true;
  }

  private pickAvailableBotId(
    role: BotRole,
    bots: Record<string, { role: BotRole; status: string }>
  ): string | undefined {
    return Object.entries(bots).find(([, b]) => b.role === role && b.status === 'idle')?.[0];
  }

  private async assignSubtask(hiveTask: HiveTask, subtask: Subtask): Promise<void> {
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

  private async assignReadySubtasks(hiveTask: HiveTask): Promise<void> {
    const completed = new Set(hiveTask.subtasks.filter((s) => s.status === 'completed').map((s) => s.id));
    for (const subtask of hiveTask.subtasks) {
      if (subtask.status !== 'pending') continue;
      const canStart =
        subtask.dependencies.length === 0 ||
        subtask.dependencies.every((dep) => completed.has(dep));
      if (canStart) await this.assignSubtask(hiveTask, subtask);
    }
  }

  private async handlePheromone(message: PheromoneMessage): Promise<void> {
    const payload = (message.payload ?? {}) as Record<string, unknown>;
    const taskId = typeof payload.taskId === 'string' ? payload.taskId : '';
    const subtaskId = typeof payload.subtaskId === 'string' ? payload.subtaskId : '';
    if (taskId.length === 0 || subtaskId.length === 0) return;

    const hiveTask = await this.hiveState.getTask(taskId);
    if (!hiveTask) return;

    if (message.type === 'task_complete') {
      const subtasks: Subtask[] = hiveTask.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, status: 'completed' as const, completedAt: new Date() } : s
      );
      const allDone = subtasks.every((s) => s.status === 'completed');
      await this.hiveState.updateTask(taskId, {
        subtasks,
        status: allDone ? 'completed' : 'in_progress',
        completedAt: allDone ? new Date() : undefined,
      });
      if (!allDone) {
        const refreshed = await this.hiveState.getTask(taskId);
        if (refreshed) await this.assignReadySubtasks(refreshed);
      }
      return;
    }

    if (message.type === 'error') {
      const target = hiveTask.subtasks.find((s) => s.id === subtaskId);
      if (!target) return;
      const retries =
        typeof target.result === 'object' && target.result !== null
          ? Number((target.result as Record<string, unknown>).retryCount ?? 0)
          : 0;
      const nextRetry = retries + 1;
      if (nextRetry <= MAX_SUBTASK_RETRIES) {
        await this.hiveState.updateTask(taskId, {
          subtasks: hiveTask.subtasks.map((s) =>
            s.id === subtaskId
              ? {
                  ...s,
                  status: 'pending' as const,
                  assignedBotId: undefined,
                  result: { retryCount: nextRetry, lastError: payload.error ?? 'unknown' },
                }
              : s
          ),
          status: 'in_progress',
        });
        const refreshed = await this.hiveState.getTask(taskId);
        const pending = refreshed?.subtasks.find((s) => s.id === subtaskId);
        if (refreshed && pending) await this.assignSubtask(refreshed, pending);
        return;
      }
      await this.hiveState.updateTask(taskId, {
        subtasks: hiveTask.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, status: 'failed' as const, result: { retryCount: nextRetry } } : s
        ),
        status: 'failed',
      });
    }
  }

  async retrySubtask(taskId: string, subtaskId: string): Promise<boolean> {
    const hiveTask = await this.hiveState.getTask(taskId);
    if (!hiveTask) return false;
    const target = hiveTask.subtasks.find((s) => s.id === subtaskId);
    if (!target) return false;
    const pending: Subtask = {
      ...target,
      status: 'pending',
      assignedBotId: undefined,
      completedAt: undefined,
    };
    await this.hiveState.updateTask(taskId, {
      subtasks: hiveTask.subtasks.map((s) => (s.id === subtaskId ? pending : s)),
      status: 'in_progress',
    });
    const refreshed = await this.hiveState.getTask(taskId);
    if (!refreshed) return false;
    await this.assignSubtask(refreshed, pending);
    return true;
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
      subtasks: decomposeObjective(req.objective, taskId),
      status: 'in_progress',
      createdAt: new Date(),
    };
    await this.hiveState.addTask(hiveTask);
    await this.assignReadySubtasks(hiveTask);
    return hiveTask;
  }

  async close(): Promise<void> {
    await this.hiveState.close();
    await this.pheromones.close();
  }
}
