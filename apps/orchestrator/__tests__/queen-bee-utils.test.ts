import { describe, expect, it } from 'vitest';
import {
  decomposeObjectiveIntoSubtasks,
  inferBotRoleFromDescription,
} from '../src/hive/queen-bee.js';

describe('queen bee utils', () => {
  it('infers researcher role from description', () => {
    expect(inferBotRoleFromDescription('Investigar proveedores LLM y costos')).toBe('researcher');
  });

  it('infers tester role from test-oriented description', () => {
    expect(inferBotRoleFromDescription('Write tests for API endpoints')).toBe('tester');
  });

  it('infers deployer role from deploy description', () => {
    expect(inferBotRoleFromDescription('Deploy the release to production')).toBe('deployer');
  });

  it('infers doc-writer role from documentation description', () => {
    expect(inferBotRoleFromDescription('Write README for the module')).toBe('doc-writer');
  });

  it('infers security role from security description', () => {
    expect(inferBotRoleFromDescription('Check for security vulnerabilities')).toBe('security');
  });

  it('defaults to coder role for unrecognized descriptions', () => {
    expect(inferBotRoleFromDescription('Build the new feature')).toBe('coder');
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

  it('creates single subtask when objective has no separator', () => {
    const subtasks = decomposeObjectiveIntoSubtasks('Una sola tarea sin separadores', 'task-abc');
    expect(subtasks).toHaveLength(1);
    expect(subtasks[0]?.id).toBe('task-abc-subtask-1');
    expect(subtasks[0]?.dependencies).toEqual([]);
  });

  it('sets parentTaskId correctly on all subtasks', () => {
    const subtasks = decomposeObjectiveIntoSubtasks('Tarea uno; tarea dos', 'task-xyz');
    expect(subtasks).toHaveLength(2);
    for (const subtask of subtasks) {
      expect(subtask.parentTaskId).toBe('task-xyz');
    }
  });

  it('sets initial status to pending for all subtasks', () => {
    const subtasks = decomposeObjectiveIntoSubtasks('Hacer esto; hacer aquello', 'task-0');
    for (const subtask of subtasks) {
      expect(subtask.status).toBe('pending');
    }
  });
});
