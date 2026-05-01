import { z } from 'zod';
import type { Bot, Subtask, PheromoneMessage } from '../types.js';
import { PheromoneChannel } from '../pheromone-channel.js';
import { HiveStateStore } from '../hive-state.js';
import { processIntent } from '../../engine.js';
import { getInternalPlatformTenantSlug } from '../../tenant-defaults.js';

const codeTaskSchema = z.object({
  type: z.literal('coding').optional(),
  targetPath: z.string().optional(),
  description: z.string().optional(),
});

export class CoderBot implements Bot {
  id: string;
  role: 'coder' = 'coder';
  status: 'idle' | 'working' | 'blocked' | 'offline' = 'idle';
  skills = ['code_generation', 'refactoring', 'testing', 'git_integration'];
  capacity = 2;
  concurrentTasks = 0;
  lastHeartbeat = new Date();
  private pheromoneChannel: PheromoneChannel;
  private stateStore: HiveStateStore;
  private currentTasks: Map<string, Subtask> = new Map();

  constructor() {
    this.id = `coder-${Date.now()}`;
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
    console.log(`[CoderBot] ${this.id} iniciado y registrado`);
  }

  private setupListeners(): void {
    void this.pheromoneChannel.subscribe(this.id, ['subtask_assignment'], async (message: PheromoneMessage) => {
      const subtask = message.payload as Subtask;
      await this.handleTask(subtask);
    });
  }

  async handleTask(subtask: Subtask): Promise<void> {
    if (this.concurrentTasks >= this.capacity) {
      console.log(`[CoderBot] ${this.id} está en capacidad máxima`);
      return;
    }

    this.currentTasks.set(subtask.id, subtask);
    this.concurrentTasks++;
    this.status = 'working';

    try {
      await this.stateStore.updateBotStatus(this.id, 'working');

      const result = await this.executeCode(subtask);

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
        payload: {
          subtaskId: subtask.id,
          taskId: subtask.taskId,
          result,
        },
      });

      console.log(`[CoderBot] Tarea ${subtask.id} completada`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CoderBot] Error:`, errorMsg);

      await this.pheromoneChannel.publish({
        senderId: this.id,
        type: 'error',
        timestamp: new Date(),
        payload: {
          subtaskId: subtask.id,
          taskId: subtask.taskId,
          error: errorMsg,
        },
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

  private async executeCode(subtask: Subtask): Promise<unknown> {
    const spec = subtask.specification ? codeTaskSchema.safeParse(subtask.specification) : null;

    const prompt = `
Tarea de codificación: ${subtask.description}
${spec && spec.success ? `Especificación: ${JSON.stringify(spec.data)}` : ''}

Acciones:
1. Analizar requisitos
2. Generar código siguiendo mejores prácticas
3. Sin tipos 'any' en TypeScript
4. Comentarios solo donde sea necesario
5. Código limpio y mantenible

Responde con JSON:
{
  "success": boolean,
  "filePath": string,
  "changes": number,
  "summary": string
}
`;

    const result = await processIntent({
      intent: 'oar_react',
      context: { prompt },
      initiated_by: 'system',
      tenant_slug: getInternalPlatformTenantSlug(),
    });

    return result;
  }

  async stop(): Promise<void> {
    console.log(`[CoderBot] ${this.id} detenido`);
    await this.stateStore.close();
    await this.pheromoneChannel.close();
  }
}

export function startCoderBot(): CoderBot {
  const bot = new CoderBot();
  void bot.start();
  return bot;
}
