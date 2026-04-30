export type BotRole =
  | 'queen'          // Director: planifica y asigna
  | 'coder'          // Escribe y modifica código
  | 'researcher'     // Investiga en web y documentación
  | 'tester'         // Escribe y ejecuta pruebas
  | 'deployer'       // Despliega cambios
  | 'doc-writer'     // Genera documentación
  | 'security';      // Análisis de seguridad

export interface Bot {
  id: string;
  role: BotRole;
  status: 'idle' | 'working' | 'blocked' | 'offline';
  currentTaskId?: string;
  skills: string[];
  capacity: number;
  lastHeartbeat: Date;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  handleTask?(subtask: Subtask): Promise<void>;
}

export type PheromoneType = 'finding' | 'request_help' | 'task_complete' | 'error' | 'status_update' | 'subtask_assignment';

export interface PheromoneMessage {
  id?: string;
  from?: string;
  senderId?: string;
  to?: string;
  recipientId?: string;
  type: PheromoneType;
  content?: string;
  payload?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ttl?: number;
}

export interface HiveTask {
  id: string;
  objective: string;
  subtasks: Subtask[];
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  result?: unknown;
  createdAt: Date;
  completedAt?: Date;
}

export interface Subtask {
  id: string;
  taskId?: string;
  parentTaskId: string;
  description: string;
  specification?: Record<string, unknown>;
  assignedBotRole?: BotRole;
  status: 'pending' | 'assigned' | 'completed' | 'failed';
  result?: unknown;
  dependencies: string[];
  assignedBotId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface HiveState {
  tasks: HiveTask[];
  bots: Record<string, Bot>;
  lastUpdated: number;
  pheromoneLog: PheromoneMessage[];
}
