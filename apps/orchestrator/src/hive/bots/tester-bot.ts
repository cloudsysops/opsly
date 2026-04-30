import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';
import { processIntent } from '../../engine.js';

export class TesterBot implements Bot {
  id: string;
  role: 'tester' = 'tester';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = ['npm_test_runner', 'test_reporter', 'coverage_analyzer'];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();

  constructor() {
    this.id = `tester-${Date.now()}`;
    this.pheromoneChannel = new PheromoneChannel();
    this.stateStore = new HiveStateStore();
  }

  async start(): Promise<void> {
    await this.stateStore.registerBot({
      id: this.id,
      role: this.role,
      status: 'idle',
      skills: this.skills,
      capacity: this.capacity,
      lastHeartbeat: new Date(),
    });
    this.setupListeners();
    console.log(`[TesterBot] ${this.id} iniciado`);
  }

  private setupListeners(): void {
    void this.pheromoneChannel.subscribe(this.id, ['subtask_assignment'], async (message: PheromoneMessage) => {
      const subtask = message.payload as Subtask;
      await this.handleTask(subtask);
    });
  }

  async handleTask(subtask: Subtask): Promise<void> {
    if (this.concurrentTasks >= this.capacity) {
      return;
    }

    this.currentTasks.set(subtask.id, subtask);
    this.concurrentTasks++;
    this.status = 'working';

    try {
      await this.stateStore.updateBotStatus(this.id, 'working');
      const result = await this.executeTest(subtask);

      if (subtask.taskId) {
        await this.stateStore.updateTask(subtask.taskId, {
          subtasks: [
            {
              ...subtask,
              status: 'completed',
              result,
              completedAt: new Date(),
            },
          ],
        });
      }

      await this.pheromoneChannel.publish({
        senderId: this.id,
        type: 'task_complete',
        timestamp: new Date(),
        payload: { subtaskId: subtask.id, taskId: subtask.taskId, result },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.pheromoneChannel.publish({
        senderId: this.id,
        type: 'error',
        timestamp: new Date(),
        payload: { subtaskId: subtask.id, taskId: subtask.taskId, error: errorMsg },
      });
    } finally {
      this.currentTasks.delete(subtask.id);
      this.concurrentTasks--;
      this.lastHeartbeat = new Date();
      if (this.concurrentTasks === 0) {
        this.status = 'idle';
        await this.stateStore.updateBotStatus(this.id, 'idle');
      }
    }
  }

  private async executeTest(subtask: Subtask): Promise<unknown> {
    const prompt = `Ejecuta tests para: ${subtask.description}\nResponde con { passed, failed, coverage }`;
    return processIntent({ intent: 'oar_react', context: { prompt }, initiated_by: 'system' });
  }

  async stop(): Promise<void> {
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startTesterBot(): TesterBot {
  const bot = new TesterBot();
  void bot.start();
  return bot;
}
