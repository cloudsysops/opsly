import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { Task, type TaskResult, type TaskStatus } from '../types/task';

const ORCHESTRATOR_MOVE_TOKEN = 'task-orchestrator';

export function buildRedisConnectionOptions(): ConnectionOptions {
  const raw = process.env.REDIS_URL?.trim();
  if (raw) {
    const u = new URL(raw);
    const port = u.port ? Number.parseInt(u.port, 10) : 6379;
    const opts: ConnectionOptions = {
      host: u.hostname,
      port,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      maxRetriesPerRequest: null,
    };
    if (u.username) {
      opts.username = decodeURIComponent(u.username);
    }
    if (u.protocol === 'rediss:') {
      opts.tls = {};
    }
    return opts;
  }
  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
}

export class TaskQueue {
  private queue!: Queue<Task, TaskResult, string>;
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }
    const connection = buildRedisConnectionOptions();
    this.queue = new Queue<Task, TaskResult, string>('opsly-tasks', {
      connection,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
    await this.queue.waitUntilReady();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await this.queue.close();
    this.connected = false;
  }

  async addTask(task: Task): Promise<void> {
    await this.queue.add(task.id, task, {
      priority:
        task.priority === 'critical'
          ? 1
          : task.priority === 'high'
            ? 2
            : task.priority === 'medium'
              ? 3
              : 4,
      jobId: task.id,
      removeOnComplete: false,
    });
  }

  async getTask(taskId: string): Promise<Task | null> {
    const job = await this.queue.getJob(taskId);
    return job?.data ?? null;
  }

  async getPendingTasks(): Promise<Task[]> {
    const jobs = await this.queue.getJobs(['waiting', 'prioritized', 'delayed']);
    return jobs.map(job => job.data);
  }

  async getExecutingTasks(): Promise<Task[]> {
    const jobs = await this.queue.getJobs(['active']);
    return jobs.map(job => job.data);
  }

  async getCompletedTasks(): Promise<Task[]> {
    const jobs = await this.queue.getJobs(['completed']);
    return jobs.map(job => job.data);
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      throw new Error(`Task ${taskId} not found`);
    }

    const data: Task = { ...job.data, status };
    if (metadata) {
      data.metadata = { ...data.metadata, ...metadata };
      const wid = metadata.worker_id;
      if (typeof wid === 'string') {
        data.worker_id = wid;
      }
      const startedAt = metadata.started_at;
      if (typeof startedAt === 'string') {
        data.started_at = startedAt;
      }
    }

    await job.updateData(data);
  }

  async assignTask(taskId: string, workerId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'assigned', { worker_id: workerId });
  }

  async completeTask(taskId: string, result: TaskResult): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      throw new Error(`Task ${taskId} not found`);
    }

    const data: Task = {
      ...job.data,
      status: 'completed',
      completed_at: new Date().toISOString(),
      result,
    };

    await job.updateData(data);
    await job.moveToCompleted(result, ORCHESTRATOR_MOVE_TOKEN, false);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      throw new Error(`Task ${taskId} not found`);
    }

    const failure: TaskResult = { success: false, error };
    const data: Task = {
      ...job.data,
      status: 'failed',
      completed_at: new Date().toISOString(),
      result: failure,
    };

    await job.updateData(data);
    await job.moveToFailed(new Error(error), ORCHESTRATOR_MOVE_TOKEN, false);
  }

  async cancelTask(taskId: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) {
      throw new Error(`Task ${taskId} not found`);
    }

    await job.remove();
  }
}

export const taskQueue = new TaskQueue();
