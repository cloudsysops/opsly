import { createClient } from '@supabase/supabase-js';
import { Task, Worker, TaskLog } from '../types/task';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials not configured, using Redis-only mode');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export class SupabaseService {
  async saveTask(task: Task): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('opsly_tasks')
      .upsert({
        id: task.id,
        task_type: task.type,
        title: task.title,
        description: task.description,
        prompt: task.prompt,
        priority: task.priority,
        status: task.status,
        assigned_worker: task.assigned_worker,
        worker_id: task.worker_id,
        created_by: task.created_by,
        created_at: task.created_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        estimated_days: task.estimated_days,
        git_branch: task.branch,
        dependencies: task.dependencies,
        metadata: task.metadata,
        result: task.result,
      });

    if (error) throw new Error(`Failed to save task: ${error.message}`);
  }

  async getTask(taskId: string): Promise<Task | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('opsly_tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data ? this.mapDbTaskToTask(data as Record<string, unknown>) : null;
  }

  async getTasks(status?: string): Promise<Task[]> {
    if (!supabase) return [];

    let query = supabase.from('opsly_tasks').select('*');
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);

    return (data || []).map(row => this.mapDbTaskToTask(row as Record<string, unknown>));
  }

  async saveWorker(worker: Worker): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('opsly_workers')
      .upsert({
        id: worker.id,
        worker_type: worker.type,
        status: worker.status,
        current_task_id: worker.current_task_id,
        last_heartbeat: worker.last_heartbeat,
        capacity: worker.capacity,
        metadata: worker.metadata,
      });

    if (error) throw new Error(`Failed to save worker: ${error.message}`);
  }

  async getWorker(workerId: string): Promise<Worker | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('opsly_workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch worker: ${error.message}`);
    }

    return data ? this.mapDbWorkerToWorker(data as Record<string, unknown>) : null;
  }

  async addLog(taskId: string, log: TaskLog): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from('opsly_task_logs')
      .insert({
        task_id: taskId,
        level: log.level,
        message: log.message,
        context: log.context,
      });

    if (error) throw new Error(`Failed to save log: ${error.message}`);
  }

  async getLogs(taskId: string): Promise<TaskLog[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('opsly_task_logs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch logs: ${error.message}`);

    return (data || []).map(row => ({
      timestamp: row.created_at,
      level: row.level,
      message: row.message,
      context: row.context,
    }));
  }

  private mapDbTaskToTask(dbTask: Record<string, unknown>): Task {
    const deps = dbTask.dependencies;
    return {
      id: String(dbTask.id),
      type: dbTask.task_type as Task['type'],
      title: String(dbTask.title ?? ''),
      description: String(dbTask.description ?? ''),
      prompt: String(dbTask.prompt ?? ''),
      priority: dbTask.priority as Task['priority'],
      status: dbTask.status as Task['status'],
      assigned_worker: dbTask.assigned_worker as Task['assigned_worker'],
      worker_id: dbTask.worker_id !== undefined && dbTask.worker_id !== null ? String(dbTask.worker_id) : undefined,
      created_by: String(dbTask.created_by ?? ''),
      created_at: String(dbTask.created_at ?? ''),
      started_at: dbTask.started_at !== undefined && dbTask.started_at !== null ? String(dbTask.started_at) : undefined,
      completed_at:
        dbTask.completed_at !== undefined && dbTask.completed_at !== null ? String(dbTask.completed_at) : undefined,
      estimated_days:
        typeof dbTask.estimated_days === 'number' ? dbTask.estimated_days : undefined,
      dependencies: Array.isArray(deps) ? deps.map(String) : [],
      logs: [],
      result: dbTask.result as Task['result'],
      branch: dbTask.git_branch !== undefined && dbTask.git_branch !== null ? String(dbTask.git_branch) : undefined,
      metadata: dbTask.metadata as Task['metadata'],
    };
  }

  private mapDbWorkerToWorker(dbWorker: Record<string, unknown>): Worker {
    return {
      id: String(dbWorker.id),
      type: dbWorker.worker_type as Worker['type'],
      status: dbWorker.status as Worker['status'],
      current_task_id:
        dbWorker.current_task_id !== undefined && dbWorker.current_task_id !== null
          ? String(dbWorker.current_task_id)
          : undefined,
      last_heartbeat: String(dbWorker.last_heartbeat ?? ''),
      capacity: typeof dbWorker.capacity === 'number' ? dbWorker.capacity : 1,
      metadata: dbWorker.metadata as Worker['metadata'],
    };
  }
}

export const supabaseService = new SupabaseService();
