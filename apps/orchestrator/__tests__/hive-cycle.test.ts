import { describe, expect, it } from 'vitest';
import { QueenBee, type QueenPheromoneBus, type QueenStateStore } from '../src/hive/queen-bee.js';
import { computeHiveStats } from '../src/hive/hive-stats.js';
import type { Bot, HiveState, HiveTask, PheromoneMessage } from '../src/hive/types.js';

class InMemoryHiveStateStore implements QueenStateStore {
  private state: HiveState;

  constructor(bots: Record<string, Bot>) {
    this.state = {
      tasks: [],
      bots,
      lastUpdated: Date.now(),
      pheromoneLog: [],
    };
  }

  async getState(): Promise<HiveState> {
    return this.state;
  }

  async getTask(taskId: string): Promise<HiveTask | null> {
    return this.state.tasks.find((task) => task.id === taskId) ?? null;
  }

  async addTask(task: HiveTask): Promise<void> {
    this.state = {
      ...this.state,
      tasks: [...this.state.tasks, task],
      lastUpdated: Date.now(),
    };
  }

  async updateTask(taskId: string, update: Partial<HiveTask>): Promise<void> {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((task) => (task.id === taskId ? { ...task, ...update } : task)),
      lastUpdated: Date.now(),
    };
  }

  async close(): Promise<void> {
    return undefined;
  }
}

class InMemoryPheromoneBus implements QueenPheromoneBus {
  readonly published: PheromoneMessage[] = [];
  private subscriptions: Array<{
    botId: string;
    messageTypes: PheromoneMessage['type'][];
    callback: (message: PheromoneMessage) => void;
  }> = [];

  async publish(message: PheromoneMessage): Promise<void> {
    this.published.push(message);
  }

  async subscribe(
    botId: string,
    messageTypes: PheromoneMessage['type'][],
    callback: (message: PheromoneMessage) => void
  ): Promise<void> {
    this.subscriptions.push({ botId, messageTypes, callback });
  }

  async emit(message: PheromoneMessage): Promise<void> {
    for (const subscription of this.subscriptions) {
      if (!subscription.messageTypes.includes(message.type)) continue;
      const recipient = message.to ?? message.recipientId;
      if (recipient && recipient !== subscription.botId && recipient !== 'broadcast') continue;
      subscription.callback(message);
    }
    await Promise.resolve();
  }

  async close(): Promise<void> {
    return undefined;
  }
}

function bot(id: string, role: Bot['role']): Bot {
  return {
    id,
    role,
    status: 'idle',
    skills: [role],
    capacity: 1,
    lastHeartbeat: new Date('2026-05-06T00:00:00.000Z'),
  };
}

async function flushAsyncCallbacks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('hive integrated objective cycle', () => {
  it('tracks objective assignment, completion, automatic retry, manual retry, and retry stats', async () => {
    const stateStore = new InMemoryHiveStateStore({
      'coder-1': bot('coder-1', 'coder'),
      'tester-1': bot('tester-1', 'tester'),
    });
    const pheromones = new InMemoryPheromoneBus();
    const queenBee = new QueenBee({ hiveState: stateStore, pheromones });
    const submitted = await queenBee.processObjective({
      objective: 'Implementar endpoint. Escribir tests',
      priority: 'high',
    });
    const taskId = submitted.id;

    expect(submitted.status).toBe('in_progress');
    expect(pheromones.published.at(-1)).toMatchObject({
      recipientId: 'coder-1',
      type: 'subtask_assignment',
      metadata: { taskId },
    });

    await pheromones.emit({
      senderId: 'coder-1',
      type: 'task_complete',
      timestamp: new Date(),
      payload: { taskId, subtaskId: `${taskId}-subtask-1`, result: { ok: true } },
    });
    await flushAsyncCallbacks();

    expect(pheromones.published.at(-1)).toMatchObject({
      recipientId: 'tester-1',
      type: 'subtask_assignment',
      metadata: { taskId },
    });

    for (const attempt of [1, 2]) {
      await pheromones.emit({
        senderId: 'tester-1',
        type: 'error',
        timestamp: new Date(),
        payload: { taskId, subtaskId: `${taskId}-subtask-2`, error: `failure-${attempt}` },
      });
      await flushAsyncCallbacks();
      const task = await stateStore.getTask(taskId);
      const retried = task?.subtasks.find((subtask) => subtask.id === `${taskId}-subtask-2`);
      expect(retried).toMatchObject({
        status: 'assigned',
        assignedBotId: 'tester-1',
        result: { retryCount: attempt, lastError: `failure-${attempt}` },
      });
    }

    await pheromones.emit({
      senderId: 'tester-1',
      type: 'error',
      timestamp: new Date(),
      payload: { taskId, subtaskId: `${taskId}-subtask-2`, error: 'failure-3' },
    });
    await flushAsyncCallbacks();

    let task = await stateStore.getTask(taskId);
    expect(task?.status).toBe('failed');

    const retriedManually = await queenBee.retrySubtask(taskId, `${taskId}-subtask-2`);
    expect(retriedManually).toBe(true);

    const statsAfterRetry = computeHiveStats(await stateStore.getState());
    expect(statsAfterRetry).toMatchObject({
      totalSubtasks: 2,
      completedSubtasks: 1,
      failedSubtasks: 0,
      retryingSubtasks: 1,
      retryAttempts: 3,
      manualRetryAttempts: 1,
    });

    await pheromones.emit({
      senderId: 'tester-1',
      type: 'task_complete',
      timestamp: new Date(),
      payload: { taskId, subtaskId: `${taskId}-subtask-2`, result: { ok: true } },
    });
    await flushAsyncCallbacks();

    task = await stateStore.getTask(taskId);
    expect(task?.status).toBe('completed');
    expect(computeHiveStats(await stateStore.getState())).toMatchObject({
      completedTasks: 1,
      completedSubtasks: 2,
      totalSubtasks: 2,
    });
  });
});
