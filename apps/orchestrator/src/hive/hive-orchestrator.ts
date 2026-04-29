import { QueenBee } from './queen-bee.js';
import { BotFactory, type BotRole } from './bots/bot-factory.js';
import { HiveStateStore } from './hive-state.js';
import type { Bot, HiveTask } from './types.js';

export interface ObjectiveRequest {
  objective: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedBots?: BotRole[];
  maxDuration?: number;
  budget?: number;
}

export interface ObjectiveResult {
  taskId: string;
  objective: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
}

export class HiveOrchestrator {
  private queensBee: QueenBee;
  private stateStore: HiveStateStore;
  private botFactory: typeof BotFactory;
  private activeObjectives: Map<string, ObjectiveRequest> = new Map();

  constructor() {
    this.queensBee = new QueenBee();
    this.stateStore = new HiveStateStore();
    this.botFactory = BotFactory;
  }

  async initialize(): Promise<void> {
    const defaultBotRoles: BotRole[] = [
      'coder',
      'researcher',
      'tester',
      'deployer',
      'doc-writer',
      'security',
    ];

    const bots = await this.botFactory.createBotTeam(defaultBotRoles);
    console.log(`[HiveOrchestrator] ${bots.length} bots inicializados`);

    const state = await this.stateStore.getState();
    console.log(
      `[HiveOrchestrator] Estado actual: ${state.tasks.length} tareas, ${Object.keys(state.bots).length} bots registrados`
    );
  }

  async submitObjective(request: ObjectiveRequest): Promise<ObjectiveResult> {
    const objectiveId = `objective-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    this.activeObjectives.set(objectiveId, request);

    try {
      console.log(`[HiveOrchestrator] Objetivo sumitido: ${objectiveId}`);
      console.log(`  Descripción: ${request.objective}`);
      console.log(`  Prioridad: ${request.priority ?? 'medium'}`);

      const task = await this.queensBee.processObjective({
        objective: request.objective,
        priority: request.priority,
        assignedBotRoles: request.assignedBots,
      });

      return {
        taskId: task.id,
        objective: request.objective,
        status: 'pending',
        startedAt: new Date(),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[HiveOrchestrator] Error procesando objetivo ${objectiveId}:`, errorMsg);

      return {
        taskId: objectiveId,
        objective: request.objective,
        status: 'failed',
        error: errorMsg,
      };
    }
  }

  async getObjectiveStatus(taskId: string): Promise<ObjectiveResult | null> {
    try {
      const state = await this.stateStore.getState();
      const task = state.tasks.find((t) => t.id === taskId);

      if (!task) {
        return null;
      }

      const completed = task.subtasks.filter((s) => s.status === 'completed').length;
      const total = task.subtasks.length;

      return {
        taskId: task.id,
        objective: task.objective,
        status: task.status === 'planned' ? 'pending' : task.status,
        startedAt: task.createdAt,
        completedAt: task.completedAt,
        result: {
          completedSubtasks: completed,
          totalSubtasks: total,
          progress: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      };
    } catch (error) {
      console.error(`[HiveOrchestrator] Error obteniendo estado:`, error);
      return null;
    }
  }

  async retrySubtask(taskId: string, subtaskId: string): Promise<boolean> {
    return this.queensBee.retrySubtask(taskId, subtaskId);
  }

  async listActiveBots(): Promise<Array<{ id: string; role: string; status: string }>> {
    const state = await this.stateStore.getState();
    return Object.values(state.bots).map((bot: Bot) => ({
      id: bot.id,
      role: bot.role,
      status: bot.status,
    }));
  }

  async getHiveStats(): Promise<{
    activeBots: number;
    pendingTasks: number;
    completedTasks: number;
    totalSubtasks: number;
    completedSubtasks: number;
  }> {
    const state = await this.stateStore.getState();

    const completedSubtasks = state.tasks.flatMap((t) =>
      t.subtasks.filter((s) => s.status === 'completed')
    ).length;

    const totalSubtasks = state.tasks.flatMap((t) => t.subtasks).length;

    return {
      activeBots: Object.values(state.bots).filter((b: Bot) => b.status === 'working').length,
      pendingTasks: state.tasks.filter((t) => t.status === 'planned').length,
      completedTasks: state.tasks.filter((t) => t.status === 'completed').length,
      totalSubtasks,
      completedSubtasks,
    };
  }

  async shutdown(): Promise<void> {
    console.log('[HiveOrchestrator] Apagando...');
    await this.botFactory.stopAllBots();
    this.activeObjectives.clear();
    console.log('[HiveOrchestrator] Apagado completo');
  }
}
