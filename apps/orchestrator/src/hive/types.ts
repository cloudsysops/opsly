/**
 * SwarmOps — Tipos del sistema "Colmena de Bots" (Hive Model).
 *
 * Queen Bee coordina a los Worker Bees mediante canales feromunales (Redis Pub/Sub)
 * y un tablero compartido (HiveState) almacenado en Redis.
 */

/** Roles de los bots especializados. */
export type BotRole =
  | 'queen'       // Director: planifica y asigna subtareas
  | 'coder'       // Escribe y modifica código
  | 'researcher'  // Investiga en web y documentación
  | 'tester'      // Escribe y ejecuta pruebas
  | 'deployer'    // Despliega cambios
  | 'doc-writer'  // Genera documentación
  | 'security';   // Análisis de seguridad

/** Estado de un bot en la colmena. */
export type BotStatus = 'idle' | 'working' | 'blocked' | 'offline';

/** Estado de una HiveTask. */
export type HiveTaskStatus = 'planned' | 'in_progress' | 'completed' | 'failed';

/** Estado de una Subtask. */
export type SubtaskStatus = 'pending' | 'assigned' | 'completed' | 'failed';

/** Tipo de mensaje feromonal. */
export type PheromoneMessageType = 'finding' | 'request_help' | 'task_complete' | 'error';

/** Registro de un bot en la colmena. */
export interface Bot {
  id: string;
  role: BotRole;
  status: BotStatus;
  currentTaskId?: string;
  /** Skills (capacidades) que este bot puede utilizar. */
  skills: string[];
  /** Máximo de subtareas simultáneas. */
  capacity: number;
}

/**
 * Mensaje feromonal: canal de comunicación asíncrono entre bots.
 * El TTL simula la evaporación de feromonas reales.
 */
export interface PheromoneMessage {
  id: string;
  from: string;             // ID del bot emisor
  to?: string;              // ID específico o 'broadcast'
  type: PheromoneMessageType;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: string;        // ISO-8601
  /** Time-to-live en segundos; undefined = sin expiración. */
  ttl?: number;
}

/** Subtarea atómica dentro de un HiveTask. */
export interface Subtask {
  id: string;
  parentTaskId: string;
  description: string;
  assignedBotRole?: BotRole;
  assignedBotId?: string;
  status: SubtaskStatus;
  result?: Record<string, unknown>;
  /** IDs de subtareas que deben completarse antes de iniciar ésta. */
  dependencies: string[];
}

/** Tarea de alto nivel gestionada por la Queen Bee. */
export interface HiveTask {
  id: string;
  tenantSlug: string;
  requestId: string;
  objective: string;
  subtasks: Subtask[];
  status: HiveTaskStatus;
  assignedTo?: string;   // ID de la queen bee asignada
  result?: Record<string, unknown>;
  createdAt: string;     // ISO-8601
  updatedAt: string;     // ISO-8601
}

/** Payload del job BullMQ para despachar una tarea hive. */
export interface HiveDispatchPayload {
  objective: string;
  tenant_slug: string;
  request_id: string;
  /** Roles de bots requeridos; si está vacío la queen infiere los necesarios. */
  required_roles?: BotRole[];
  /** Presupuesto simbólico USD para la tarea completa. */
  cost_budget_usd?: number;
  metadata?: Record<string, unknown>;
}

/** Resultado del job HiveWorker devuelto a BullMQ. */
export interface HiveDispatchResult {
  hive_task_id: string;
  subtasks_count: number;
  status: HiveTaskStatus;
  result?: Record<string, unknown>;
}

/** Payload del job BullMQ `hive_worker_bee` procesado por HiveWorker. */
export interface HiveWorkerBeePayload {
  hive_task_id: string;
  subtask_id: string;
  subtask_description: string;
  bot_role: BotRole;
  bot_id?: string;
  objective: string;
}
