import { describe, expect, it } from 'vitest';
import { decomposeObjectiveIntoSubtasks, inferBotRoleFromDescription } from '../src/hive/queen-bee.js';

describe('queen bee utils', () => {
  it('infers researcher role from description', () => {
    expect(inferBotRoleFromDescription('Investigar proveedores LLM y costos')).toBe('researcher');
  });

  it('infers tester role from test-oriented description', () => {
    expect(inferBotRoleFromDescription('Write tests for API endpoints')).toBe('tester');
  });

  it('decomposes objective into ordered subtasks with dependencies', () => {
    const subtasks = decomposeObjectiveIntoSubtasks(
      'Investigar arquitectura. Implementar endpoint; Escribir tests',
      'task-123'
    );
    expect(subtasks.length).toBeGreaterThanOrEqual(2);
    expect(subtasks[0]?.dependencies).toEqual([]);
    expect(subtasks[1]?.dependencies).toContain('task-123-subtask-1');
  });
});
