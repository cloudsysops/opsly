/**
 * Nombres de propiedades en Notion (deben coincidir con las columnas de cada base).
 */
export const TASK_PROPS = {
  title: "Name",
  sprint: "Sprint",
  status: "Status",
  owner: "Owner",
  assignee: "Assignee",
  dueDate: "DueDate",
  estimatedHours: "EstimatedHours",
  actualHours: "ActualHours",
  priority: "Priority",
  prLink: "PR Link",
  description: "Description",
  tags: "Tags",
} as const;

export const SPRINT_PROPS = {
  title: "Name",
  phase: "Phase",
  startDate: "StartDate",
  endDate: "EndDate",
  status: "Status",
  velocity: "Velocity",
  /** Fórmula o número según la base */
  progressPercent: "Progress %",
} as const;

export const STANDUP_PROPS = {
  /** Columna title obligatoria en la base */
  title: "Name",
  date: "Date",
  author: "Author",
  tasksCompleted: "Tasks Completed",
  blockers: "Blockers",
  commits: "Commits",
  testsPassing: "Tests Passing",
  coverage: "Coverage",
  notes: "Notes",
} as const;

export const QUALITY_PROPS = {
  title: "Check Name",
  component: "Component",
  status: "Status",
  details: "Details",
} as const;

export const METRICS_PROPS = {
  title: "Name",
  date: "Date",
  sprint: "Sprint",
  tasksCompleted: "TasksCompleted",
  tasksPlanned: "TasksPlanned",
  commits: "Commits",
  prsMerged: "PRsMerged",
  testCoverage: "TestCoverage",
  progressPercent: "Progress %",
} as const;
