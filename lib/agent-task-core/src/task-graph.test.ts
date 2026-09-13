import { describe, expect, it } from 'vitest';
import { planTaskGraphWaves, validateTaskGraph } from './task-graph.js';

function graph(nodes: any[]) {
  return { version: 'task-graph-v1', goal: 'test graph', nodes };
}

function node(id: string, dependsOn: string[] = [], conflictKey: string | null = null) {
  return {
    id,
    title: id,
    workstream: 'test',
    conflictKey,
    dependsOn,
    ownerRole: 'builder',
    runtimeCapabilities: [],
    riskClass: 'low',
    costClass: 'zero',
    writeIntent: false,
    requiresApproval: false,
    acceptanceCriteria: ['done'],
    evidenceRequirements: ['test'],
  };
}

describe('TaskGraphV1', () => {
  it('runs independent tasks in parallel', () => {
    expect(planTaskGraphWaves(graph([node('a'), node('b')]))).toEqual([
      { index: 0, taskIds: ['a', 'b'] },
    ]);
  });

  it('respects dependencies', () => {
    expect(planTaskGraphWaves(graph([node('a'), node('b', ['a']), node('c', ['b'])]))).toEqual([
      { index: 0, taskIds: ['a'] },
      { index: 1, taskIds: ['b'] },
      { index: 2, taskIds: ['c'] },
    ]);
  });

  it('serializes equal conflict keys', () => {
    expect(planTaskGraphWaves(graph([node('a', [], 'same'), node('b', [], 'same')]))).toEqual([
      { index: 0, taskIds: ['a'] },
      { index: 1, taskIds: ['b'] },
    ]);
  });

  it('rejects unresolved dependencies', () => {
    const result = validateTaskGraph(graph([node('a', ['missing'])]));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'UNRESOLVED_DEPENDENCY',
      nodeId: 'a',
      dependencyId: 'missing',
    });
  });

  it('rejects duplicate IDs', () => {
    const result = validateTaskGraph(graph([node('a'), node('a')]));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: 'DUPLICATE_ID', nodeId: 'a' });
  });

  it('rejects cycles', () => {
    const result = validateTaskGraph(graph([node('a', ['b']), node('b', ['a'])]));
    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: 'CYCLE', nodeIds: ['a', 'b'] });
  });
});
