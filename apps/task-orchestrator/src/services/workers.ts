import { Worker, Task } from '../types/task';
import { supabaseService } from './supabase';
import { taskQueue } from './queue';

const workers = new Map<string, Worker>();

export class WorkerManager {
  async registerWorker(workerId: string, workerType: string, capacity: number = 1, metadata?: Record<string, any>): Promise<Worker> {
    const worker: Worker = {
      id: workerId,
      type: workerType as any,
      status: 'idle',
      last_heartbeat: new Date().toISOString(),
      capacity,
      metadata,
    };

    workers.set(workerId, worker);
    await supabaseService.saveWorker(worker);

    return worker;
  }

  async getWorker(workerId: string): Promise<Worker | null> {
    // Try memory first (faster)
    if (workers.has(workerId)) {
      return workers.get(workerId) || null;
    }

    // Fall back to database
    const worker = await supabaseService.getWorker(workerId);
    if (worker) {
      workers.set(workerId, worker);
    }

    return worker;
  }

  async updateWorkerStatus(workerId: string, status: 'idle' | 'working' | 'offline', currentTaskId?: string): Promise<Worker> {
    let worker = workers.get(workerId);
    if (!worker) {
      worker = await supabaseService.getWorker(workerId);
      if (!worker) {
        throw new Error(`Worker ${workerId} not found`);
      }
    }

    worker.status = status;
    worker.last_heartbeat = new Date().toISOString();
    worker.current_task_id = currentTaskId;

    workers.set(workerId, worker);
    await supabaseService.saveWorker(worker);

    return worker;
  }

  async getAvailableWorker(workerType?: string): Promise<Worker | null> {
    const availableWorkers = Array.from(workers.values())
      .filter(w => w.status === 'idle' && (!workerType || w.type === workerType));

    if (availableWorkers.length === 0) return null;

    // Return worker with lowest current load
    return availableWorkers.reduce((prev, current) =>
      (current.capacity > prev.capacity) ? current : prev
    );
  }

  async assignTaskToWorker(task: Task, workerId: string): Promise<void> {
    const worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    // Update task
    await taskQueue.assignTask(task.id, workerId);
    await supabaseService.saveTask(task);

    // Update worker
    await this.updateWorkerStatus(workerId, 'working', task.id);
  }

  async completeTask(taskId: string, workerId: string, result: any): Promise<void> {
    // Update task status
    await taskQueue.completeTask(taskId, result);

    // Update worker status
    await this.updateWorkerStatus(workerId, 'idle');

    // Fetch and save updated task
    const task = await taskQueue.getTask(taskId);
    if (task) {
      await supabaseService.saveTask(task);
    }
  }

  async failTask(taskId: string, workerId: string, error: string): Promise<void> {
    // Update task status
    await taskQueue.failTask(taskId, error);

    // Update worker status
    await this.updateWorkerStatus(workerId, 'idle');

    // Fetch and save updated task
    const task = await taskQueue.getTask(taskId);
    if (task) {
      await supabaseService.saveTask(task);
    }
  }

  async heartbeat(workerId: string, status: 'idle' | 'working', currentTaskId?: string): Promise<Worker> {
    let worker = await this.getWorker(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    worker.status = status;
    worker.last_heartbeat = new Date().toISOString();
    if (currentTaskId) {
      worker.current_task_id = currentTaskId;
    }

    workers.set(workerId, worker);
    await supabaseService.saveWorker(worker);

    return worker;
  }

  getAllWorkers(): Worker[] {
    return Array.from(workers.values());
  }

  getWorkerStats() {
    const allWorkers = this.getAllWorkers();
    return {
      total: allWorkers.length,
      idle: allWorkers.filter(w => w.status === 'idle').length,
      working: allWorkers.filter(w => w.status === 'working').length,
      offline: allWorkers.filter(w => w.status === 'offline').length,
    };
  }
}

export const workerManager = new WorkerManager();
