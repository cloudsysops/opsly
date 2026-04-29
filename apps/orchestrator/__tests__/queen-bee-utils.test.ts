import { describe, expect, it } from 'vitest';
import { decomposeObjective, inferBotRole } from '../src/hive/queen-bee.js';

describe('queen-bee utils', () => {
  it('infers research role from spanish description', () => {
    expect(inferBotRole('investigar proveedores y opciones')).toBe('researcher');
  });

  it('infers tester role for test-oriented subtasks', () => {
    expect(inferBotRole('write tests for api endpoints')).toBe('tester');
  });

  it('decomposes objective preserving dependency chain', () => {
    const subtasks = decomposeObjective('Investigar arquitectura. Implementar endpoint. Escribir tests', 'task-1');
    expect(subtasks.length).toBe(3);
    expect(subtasks[0]?.dependencies).toEqual([]);
    expect(subtasks[1]?.dependencies).toEqual(['task-1-subtask-1']);
    expect(subtasks[2]?.dependencies).toEqual(['task-1-subtask-2']);
  });
});
