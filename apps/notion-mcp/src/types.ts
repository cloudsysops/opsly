export type TaskStatus =
  | "Backlog"
  | "Ready"
  | "In Progress"
  | "In Review"
  | "Done";

export type TaskPriority = "Low" | "Medium" | "High" | "Blocker";

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly sprint: string;
  readonly status: TaskStatus;
  /** Notion user id (people), si aplica */
  readonly owner: string;
  readonly assignee?: string;
  readonly dueDate?: string;
  readonly estimatedHours?: number;
  readonly actualHours?: number;
  readonly priority: TaskPriority;
  readonly prLink?: string;
  readonly description?: string;
  readonly tags?: string[];
  readonly created: string;
  readonly updated: string;
}

export type SprintPhase = "Fase 1" | "Fase 2" | "Fase 3";

export type SprintStatus = "Planned" | "Active" | "Completed";

export interface Sprint {
  readonly id: string;
  readonly name: string;
  readonly phase: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: SprintStatus;
  readonly progress: number;
  readonly velocity: number;
}

export interface DailyStandup {
  readonly id: string;
  /** Fecha ISO (YYYY-MM-DD) */
  readonly date: string;
  readonly author: string;
  readonly tasksCompleted: string[];
  readonly blockers?: string;
  readonly commits: number;
  readonly testsPassing: number;
  readonly coverage: number;
  readonly notes?: string;
}

export type QualityStatus = "Pass" | "Warn" | "Fail";

export interface QualityGate {
  readonly id: string;
  readonly checkName: string;
  readonly component: string;
  readonly status: QualityStatus;
  readonly details?: string;
  readonly lastChecked: string;
}

export interface MetricsRow {
  readonly id: string;
  readonly date: string;
  readonly sprintId: string;
  readonly tasksCompleted: number;
  readonly tasksPlanned: number;
  readonly progress: number;
  readonly commits: number;
  readonly prsMerged: number;
  readonly testCoverage: number;
}
