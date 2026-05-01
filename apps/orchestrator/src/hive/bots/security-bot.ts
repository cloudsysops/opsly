import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';
import { resolveInternalControlPlaneTenantSlug } from '../../lib/tenant-context.js';
import { processIntent } from '../../engine.js';

export class SecurityBot implements Bot {
  id: string;
  role: 'security' = 'security';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = ['dependency_scanner', 'code_auditor', 'secrets_detector', 'compliance_checker'];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();

  constructor() {
    this.id = `security-${Date.now()}`;
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
    console.log(`[SecurityBot] ${this.id} iniciado`);
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
      const result = await this.executeScan(subtask);

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

  private async executeScan(subtask: Subtask): Promise<unknown> {
    const prompt = `Escaneo seguridad: ${subtask.description}\nResponde con { critical, high, findings }`;
    return processIntent({
      intent: 'oar_react',
      context: { prompt },
      initiated_by: 'system',
      tenant_slug: resolveInternalControlPlaneTenantSlug(),
    });
  }

  async stop(): Promise<void> {
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startSecurityBot(): SecurityBot {
  const bot = new SecurityBot();
  void bot.start();
  return bot;
}
