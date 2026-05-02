import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { taskQueue } from '../services/queue';
import { Task } from '../types/task';

describe('TaskQueue Service', () => {
  beforeAll(async () => {
    try {
      await taskQueue.connect();
    } catch (error) {
      // Skip tests if Redis is not available
      console.warn('⚠️ Redis not available, skipping queue tests');
    }
  });

  afterAll(async () => {
    try {
      await taskQueue.disconnect();
    } catch (error) {
      // Ignore disconnect errors
    }
  });

  it('should add a task to the queue', async () => {
    const task: Task = {
      id: 'test-task-1',
      type: 'implementation',
      title: 'Test task',
      description: 'Test task description',
      prompt: 'Test prompt',
      priority: 'high',
      status: 'pending',
      created_by: 'test',
      created_at: new Date().toISOString(),
      dependencies: [],
      logs: [],
    };

    await taskQueue.addTask(task);
    const retrieved = await taskQueue.getTask(task.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe(task.title);
  });

  it('should get pending tasks', async () => {
    const task: Task = {
      id: 'pending-task-1',
      type: 'bugfix',
      title: 'Pending task',
      description: 'A pending task',
      prompt: 'Fix the bug',
      priority: 'medium',
      status: 'pending',
      created_by: 'test',
      created_at: new Date().toISOString(),
      dependencies: [],
      logs: [],
    };

    await taskQueue.addTask(task);
    const pending = await taskQueue.getPendingTasks();

    expect(pending.length).toBeGreaterThan(0);
    expect(pending.some(t => t.id === task.id)).toBe(true);
  });

  it('should update task status', async () => {
    const task: Task = {
      id: 'update-task-1',
      type: 'research',
      title: 'Research task',
      description: 'Research description',
      prompt: 'Research prompt',
      priority: 'low',
      status: 'pending',
      created_by: 'test',
      created_at: new Date().toISOString(),
      dependencies: [],
      logs: [],
    };

    await taskQueue.addTask(task);
    await taskQueue.updateTaskStatus(task.id, 'executing', { started_at: new Date().toISOString() });

    const updated = await taskQueue.getTask(task.id);
    expect(updated?.status).toBe('executing');
  });

  it('should assign task to worker', async () => {
    const task: Task = {
      id: 'assign-task-1',
      type: 'implementation',
      title: 'Assign test',
      description: 'Test assignment',
      prompt: 'Test prompt',
      priority: 'high',
      status: 'pending',
      created_by: 'test',
      created_at: new Date().toISOString(),
      dependencies: [],
      logs: [],
    };

    await taskQueue.addTask(task);
    await taskQueue.assignTask(task.id, 'cursor-worker-1');

    const assigned = await taskQueue.getTask(task.id);
    expect(assigned?.status).toBe('assigned');
    expect(assigned?.worker_id).toBe('cursor-worker-1');
  });

  it('should cancel task', async () => {
    const task: Task = {
      id: 'cancel-task-1',
      type: 'documentation',
      title: 'Cancel test',
      description: 'Test cancellation',
      prompt: 'Document something',
      priority: 'low',
      status: 'pending',
      created_by: 'test',
      created_at: new Date().toISOString(),
      dependencies: [],
      logs: [],
    };

    await taskQueue.addTask(task);
    await taskQueue.cancelTask(task.id);

    const cancelled = await taskQueue.getTask(task.id);
    expect(cancelled).toBeNull();
  });
});
