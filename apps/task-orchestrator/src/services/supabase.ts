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

    return data ? this.mapDbTaskToTask(data) : null;
  }

  async getTasks(status?: string): Promise<Task[]> {
    if (!supabase) return [];

    let query = supabase.from('opsly_tasks').select('*');
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);

    return (data || []).map(row => this.mapDbTaskToTask(row));
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

    return data ? this.mapDbWorkerToWorker(data) : null;
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

  private mapDbTaskToTask(dbTask: any): Task {
    return {
      id: dbTask.id,
      type: dbTask.task_type,
      title: dbTask.title,
      description: dbTask.description,
      prompt: dbTask.prompt,
      priority: dbTask.priority,
      status: dbTask.status,
      assigned_worker: dbTask.assigned_worker,
      worker_id: dbTask.worker_id,
      created_by: dbTask.created_by,
      created_at: dbTask.created_at,
      started_at: dbTask.started_at,
      completed_at: dbTask.completed_at,
      estimated_days: dbTask.estimated_days,
      dependencies: dbTask.dependencies || [],
      logs: [],
      result: dbTask.result,
      branch: dbTask.git_branch,
      metadata: dbTask.metadata,
    };
  }

  private mapDbWorkerToWorker(dbWorker: any): Worker {
    return {
      id: dbWorker.id,
      type: dbWorker.worker_type,
      status: dbWorker.status,
      current_task_id: dbWorker.current_task_id,
      last_heartbeat: dbWorker.last_heartbeat,
      capacity: dbWorker.capacity,
      metadata: dbWorker.metadata,
    };
  }
}

export const supabaseService = new SupabaseService();
