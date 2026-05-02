import { Queue, Worker as BullWorker } from 'bullmq';
import { createClient } from 'redis';
import { Task } from '../types/task';

const redisClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

export class TaskQueue {
  private queue: Queue<Task>;
  private redisClient: typeof redisClient;

  constructor() {
    this.redisClient = redisClient;
  }

  async connect() {
    await this.redisClient.connect();
    this.queue = new Queue<Task>('opsly-tasks', {
      connection: this.redisClient,
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    });
  }

  async disconnect() {
    await this.queue.close();
    await this.redisClient.disconnect();
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
    return job?.data || null;
  }

  async getPendingTasks(): Promise<Task[]> {
    const jobs = await this.queue.getJobs(['wait', 'waiting']);
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

  async updateTaskStatus(taskId: string, status: string, metadata?: any): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) throw new Error(`Task ${taskId} not found`);

    const data = job.data;
    data.status = status;
    if (metadata) {
      data.metadata = { ...data.metadata, ...metadata };
    }

    await job.update(data);
  }

  async assignTask(taskId: string, workerId: string): Promise<void> {
    await this.updateTaskStatus(taskId, 'assigned', { worker_id: workerId });
  }

  async completeTask(taskId: string, result: any): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) throw new Error(`Task ${taskId} not found`);

    const data = job.data;
    data.status = 'completed';
    data.completed_at = new Date().toISOString();
    data.result = result;

    await job.update(data);
    await job.moveToCompleted(result, undefined, false);
  }

  async failTask(taskId: string, error: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) throw new Error(`Task ${taskId} not found`);

    const data = job.data;
    data.status = 'failed';
    data.completed_at = new Date().toISOString();
    data.result = { success: false, error };

    await job.update(data);
    await job.moveFailed(new Error(error), undefined, false);
  }

  async cancelTask(taskId: string): Promise<void> {
    const job = await this.queue.getJob(taskId);
    if (!job) throw new Error(`Task ${taskId} not found`);

    await job.remove();
  }
}

export const taskQueue = new TaskQueue();
