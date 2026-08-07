/**
 * Task Dispatcher
 * Acepta tareas desde chat, CLI, webhooks, API
 */

import type { Task, DispatchRequest, DispatchResponse } from '../types';

export class TaskDispatcher {
  private taskCache: Map<string, Task[]> = new Map();

  constructor(private config: {
    queueName?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  } = {}) {
    this.config = {
      queueName: 'peskids-tasks',
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Dispara desde chat
   * Uso: "Ejecuta PESKIDS-1.1 a PESKIDS-1.4"
   */
  async dispatchFromChat(userMessage: string): Promise<DispatchResponse> {
    const tasks = this.parseTasksFromMessage(userMessage);

    if (tasks.length === 0) {
      return {
        success: false,
        dispatchId: `dispatch_${Date.now()}`,
        taskIds: [],
        estimatedCompletionTime: 0,
        estimatedCost: 0,
        estimatedTokens: 0,
        message: 'No valid tasks found in message',
      };
    }

    return this.dispatchTasks(tasks, 'chat', userMessage);
  }

  /**
   * Dispara desde CLI (git pull)
   * Usa .cursor-auto-work.json
   */
  async dispatchFromCLI(taskConfig: Record<string, unknown>): Promise<DispatchResponse> {
    const task = this.parseTaskFromConfig(taskConfig);

    if (!task) {
      return {
        success: false,
        dispatchId: `dispatch_${Date.now()}`,
        taskIds: [],
        estimatedCompletionTime: 0,
        estimatedCost: 0,
        estimatedTokens: 0,
        message: 'Invalid task configuration',
      };
    }

    return this.dispatchTasks([task], 'cli', taskConfig);
  }

  /**
   * Dispara desde webhook
   */
  async dispatchFromWebhook(payload: Record<string, unknown>): Promise<DispatchResponse> {
    const tasks = this.parseTasksFromWebhook(payload);

    if (tasks.length === 0) {
      return {
        success: false,
        dispatchId: `dispatch_${Date.now()}`,
        taskIds: [],
        estimatedCompletionTime: 0,
        estimatedCost: 0,
        estimatedTokens: 0,
        message: 'No valid tasks in webhook payload',
      };
    }

    return this.dispatchTasks(tasks, 'webhook', payload);
  }

  /**
   * Dispara desde API
   */
  async dispatchFromAPI(request: DispatchRequest): Promise<DispatchResponse> {
    // Aquí iría validación y búsqueda de tareas por ID
    // Por ahora, retornamos placeholder

    const estimatedCompletionTime = request.taskIds.length * 15 * 60; // 15 min por tarea
    const estimatedCost = request.taskIds.length * 0.10; // $0.10 promedio
    const estimatedTokens = request.taskIds.length * 6000; // 6000 tokens promedio

    return {
      success: true,
      dispatchId: `dispatch_${Date.now()}`,
      taskIds: request.taskIds,
      estimatedCompletionTime,
      estimatedCost,
      estimatedTokens,
      message: `${request.taskIds.length} tasks dispatched from ${request.source}`,
    };
  }

  /**
   * Parsea tareas del mensaje de chat
   */
  private parseTasksFromMessage(message: string): Task[] {
    const tasks: Task[] = [];

    // Patrones a buscar
    const patterns = [
      /PESKIDS-(\d+\.\d+)/gi, // PESKIDS-1.1, PESKIDS-2.3, etc
      /TASK-(\w+)/gi, // TASK-ABC123
      /ejecuta\s+(.*?)\s+(?:a|hasta|y)\s+(.*?)(?:\.|,)/gi, // "ejecuta X hasta Y"
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(message)) !== null) {
        const taskId = match[1];
        tasks.push({
          id: `task_${taskId}`,
          taskType: 'code_edit',
          title: `Task ${taskId}`,
          description: `Auto-parsed from chat: "${message.substring(0, 100)}"`,
          files_to_edit: [],
          metadata: { source: 'chat', originalMessage: message },
        });
      }
    }

    return tasks;
  }

  /**
   * Parsea tarea de configuración JSON
   */
  private parseTaskFromConfig(config: Record<string, unknown>): Task | null {
    if (!config.task || typeof config.task !== 'object') {
      return null;
    }

    const taskConfig = config.task as Record<string, unknown>;

    return {
      id: `task_${taskConfig.id}`,
      taskType: (taskConfig.type as Task['taskType']) || 'code_edit',
      title: String(taskConfig.title || 'Untitled'),
      description: String(taskConfig.description || ''),
      files_to_edit: (taskConfig.files_to_edit as string[]) || [],
      checklist: (taskConfig.checklist as string[]) || [],
      priority: (taskConfig.priority as Task['priority']) || 'medium',
      metadata: {
        source: 'cli',
        configSource: 'cursor-auto-work.json',
      },
    };
  }

  /**
   * Parsea tareas de webhook
   */
  private parseTasksFromWebhook(payload: Record<string, unknown>): Task[] {
    const tasks: Task[] = [];

    // Si es un array de tareas
    if (Array.isArray(payload.tasks)) {
      for (const item of payload.tasks) {
        if (typeof item === 'object' && item !== null) {
          const task = this.parseTaskFromConfig({ task: item });
          if (task) tasks.push(task);
        }
      }
    }

    // Si es una tarea única
    if (payload.task) {
      const task = this.parseTaskFromConfig({ task: payload.task });
      if (task) tasks.push(task);
    }

    return tasks;
  }

  /**
   * Dispara tareas coordinadamente
   */
  private async dispatchTasks(
    tasks: Task[],
    source: DispatchRequest['source'],
    metadata: unknown
  ): Promise<DispatchResponse> {
    const dispatchId = `dispatch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskIds = tasks.map(t => t.id || `task_${Date.now()}`);

    // Estimaciones
    const estimatedCompletionTime = tasks.length * 15 * 60; // 15 min por tarea
    const estimatedCost = tasks.reduce((sum, t) => sum + (t.estimatedTokens || 6000) * 0.00001, 0); // ~$0.06 por 6k tokens
    const estimatedTokens = tasks.reduce((sum, t) => sum + (t.estimatedTokens || 6000), 0);

    this.log('info', `Dispatching ${tasks.length} tasks from ${source}:`, {
      dispatchId,
      taskIds,
      source,
    });

    // Cache para referencia
    this.taskCache.set(dispatchId, tasks);

    return {
      success: true,
      dispatchId,
      taskIds,
      estimatedCompletionTime,
      estimatedCost,
      estimatedTokens,
      message: `✅ ${tasks.length} task(s) dispatched from ${source}. Estimated completion: ${Math.round(estimatedCompletionTime / 60)} minutes`,
    };
  }

  /**
   * Obtiene tareas en caché
   */
  getTasksByDispatchId(dispatchId: string): Task[] | null {
    return this.taskCache.get(dispatchId) || null;
  }

  /**
   * Logging
   */
  private log(level: string, message: string, data?: unknown): void {
    const logLevel = this.config.logLevel || 'info';
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };

    if (levels[level as keyof typeof levels] >= levels[logLevel as keyof typeof levels]) {
      console.log(`[${level.toUpperCase()}] [TaskDispatcher] ${message}`, data || '');
    }
  }
}

export default TaskDispatcher;
