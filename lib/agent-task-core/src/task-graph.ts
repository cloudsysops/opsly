import { z } from 'zod';

export const TASK_GRAPH_VERSION = 'task-graph-v1' as const;

export const TaskGraphNodeSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(240),
  workstream: z.string().min(1).max(120),
  conflictKey: z.string().min(1).max(160).nullable().default(null),
  dependsOn: z.array(z.string().min(1).max(120)).default([]),
  ownerRole: z.string().min(1).max(120),
  runtimeCapabilities: z.array(z.string().min(1).max(120)).default([]),
  riskClass: z.enum(['low', 'medium', 'high']),
  costClass: z.enum(['zero', 'free', 'paid']),
  writeIntent: z.boolean(),
  requiresApproval: z.boolean(),
  acceptanceCriteria: z.array(z.string().min(1).max(500)).min(1),
  evidenceRequirements: z.array(z.string().min(1).max(500)).min(1),
});

export type TaskGraphNode = z.infer<typeof TaskGraphNodeSchema>;

export const TaskGraphV1Schema = z.object({
  version: z.literal(TASK_GRAPH_VERSION),
  goal: z.string().min(1).max(1000),
  nodes: z.array(TaskGraphNodeSchema).min(1),
});

export type TaskGraphV1 = z.infer<typeof TaskGraphV1Schema>;

export type TaskGraphValidationIssue =
  | { code: 'DUPLICATE_ID'; nodeId: string }
  | { code: 'SELF_DEPENDENCY'; nodeId: string }
  | { code: 'UNRESOLVED_DEPENDENCY'; nodeId: string; dependencyId: string }
  | { code: 'CYCLE'; nodeIds: string[] };

export interface TaskGraphValidationResult {
  valid: boolean;
  issues: TaskGraphValidationIssue[];
}

export interface TaskGraphWave {
  index: number;
  taskIds: string[];
}

export function validateTaskGraph(input: unknown): TaskGraphValidationResult {
  const parsed = TaskGraphV1Schema.safeParse(input);
  if (!parsed.success) {
    throw parsed.error;
  }

  const graph = parsed.data;
  const issues: TaskGraphValidationIssue[] = [];
  const seen = new Set<string>();

  for (const node of graph.nodes) {
    if (seen.has(node.id)) issues.push({ code: 'DUPLICATE_ID', nodeId: node.id });
    seen.add(node.id);
    if (node.dependsOn.includes(node.id)) issues.push({ code: 'SELF_DEPENDENCY', nodeId: node.id });
  }

  for (const node of graph.nodes) {
    for (const dep of node.dependsOn) {
      if (!seen.has(dep)) {
        issues.push({ code: 'UNRESOLVED_DEPENDENCY', nodeId: node.id, dependencyId: dep });
      }
    }
  }

  if (!issues.some(issue => issue.code === 'DUPLICATE_ID' || issue.code === 'UNRESOLVED_DEPENDENCY')) {
    const indegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();
    for (const node of graph.nodes) {
      indegree.set(node.id, node.dependsOn.length);
      for (const dep of node.dependsOn) {
        dependents.set(dep, [...(dependents.get(dep) ?? []), node.id]);
      }
    }

    const queue = [...graph.nodes.filter(node => (indegree.get(node.id) ?? 0) === 0).map(node => node.id)].sort();
    let visited = 0;

    while (queue.length > 0) {
      const id = queue.shift()!;
      visited += 1;
      for (const child of (dependents.get(id) ?? []).sort()) {
        const next = (indegree.get(child) ?? 0) - 1;
        indegree.set(child, next);
        if (next === 0) queue.push(child);
      }
      queue.sort();
    }

    if (visited !== graph.nodes.length) {
      const cyclic = graph.nodes
        .map(node => node.id)
        .filter(id => (indegree.get(id) ?? 0) > 0)
        .sort();
      issues.push({ code: 'CYCLE', nodeIds: cyclic });
    }
  }

  return { valid: issues.length === 0, issues };
}

export function parseTaskGraphV1(input: unknown): TaskGraphV1 {
  const graph = TaskGraphV1Schema.parse(input);
  const validation = validateTaskGraph(graph);
  if (!validation.valid) {
    throw new Error(`Invalid TaskGraphV1: ${JSON.stringify(validation.issues)}`);
  }
  return graph;
}

export function planTaskGraphWaves(input: unknown): TaskGraphWave[] {
  const graph = parseTaskGraphV1(input);
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const completed = new Set<string>();
  const remaining = new Set(graph.nodes.map(node => node.id));
  const waves: TaskGraphWave[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining]
      .map(id => byId.get(id)!)
      .filter(node => node.dependsOn.every(dep => completed.has(dep)))
      .sort((a, b) => a.id.localeCompare(b.id));

    if (ready.length === 0) throw new Error('TaskGraphV1 has no schedulable nodes');

    const usedConflicts = new Set<string>();
    const selected: TaskGraphNode[] = [];

    for (const node of ready) {
      if (node.conflictKey && usedConflicts.has(node.conflictKey)) continue;
      selected.push(node);
      if (node.conflictKey) usedConflicts.add(node.conflictKey);
    }

    for (const node of selected) {
      remaining.delete(node.id);
      completed.add(node.id);
    }

    waves.push({ index: waves.length, taskIds: selected.map(node => node.id) });
  }

  return waves;
}
