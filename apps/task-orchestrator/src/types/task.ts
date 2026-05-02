export type TaskStatus = 'pending' | 'assigned' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'implementation' | 'bugfix' | 'refactor' | 'research' | 'documentation';
export type WorkerType = 'cursor' | 'ci-runner' | 'claude-research';

export interface TaskLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  output?: string;
  error?: string;
  files_changed?: string[];
  commits?: string[];
  pr_url?: string;
  duration_ms?: number;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  prompt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: TaskStatus;
  assigned_worker?: WorkerType;
  worker_id?: string; // e.g., 'cursor-macbook-cboteros'
  created_by: string; // e.g., 'claude'
  created_at: string;
  started_at?: string;
  completed_at?: string;
  estimated_days?: number;
  dependencies?: string[]; // Task IDs
  logs: TaskLog[];
  result?: TaskResult;
  branch?: string; // Git branch for work
  metadata?: Record<string, any>;
}

export interface Worker {
  id: string; // e.g., 'cursor-macbook-cboteros'
  type: WorkerType;
  status: 'idle' | 'working' | 'offline';
  current_task_id?: string;
  last_heartbeat: string;
  capacity: number; // How many parallel tasks
  metadata?: Record<string, any>;
}

export interface TaskQueue {
  pending: Task[];
  executing: Map<string, Task>; // taskId -> Task
  completed: Task[];
}
