import { describe, expect, it } from 'vitest';
import {
  buildDispatchClaimDescriptors,
  classifyDispatchConflict,
  normalizeDispatchPath,
} from './dispatch-claim.js';

describe('DispatchClaimV1', () => {
  it('builds exclusive task/conflict/semantic/path descriptors', () => {
    expect(
      buildDispatchClaimDescriptors({
        taskId: 'INT-042',
        workstream: 'intelligence',
        conflictKey: 'orchestrator/local-dispatch',
        semanticScope: 'Prevent duplicate agent work',
        affectedPaths: ['./apps/orchestrator/src/http/routes/local.ts', 'lib/agent-task-core/'],
      })
    ).toEqual([
      { dimension: 'task', value: 'int-042' },
      { dimension: 'conflict', value: 'orchestrator/local-dispatch' },
      { dimension: 'semantic', value: 'prevent duplicate agent work' },
      { dimension: 'path', value: 'apps/orchestrator/src/http/routes/local.ts' },
      { dimension: 'path', value: 'lib/agent-task-core' },
    ]);
  });

  it('deduplicates repeated affected path scopes', () => {
    const descriptors = buildDispatchClaimDescriptors({
      taskId: 'A',
      workstream: 'x',
      conflictKey: 'same',
      affectedPaths: ['apps/api', './apps/api/', 'apps\\api'],
    });
    expect(descriptors.filter((d) => d.dimension === 'path')).toEqual([
      { dimension: 'path', value: 'apps/api' },
    ]);
  });

  it('rejects path traversal scopes', () => {
    expect(() => normalizeDispatchPath('../apps/api')).toThrow(/invalid affected path scope/);
    expect(() => normalizeDispatchPath('apps/../api')).toThrow(/invalid affected path scope/);
  });

  it('joins an exact task duplicate and blocks broader ownership conflicts', () => {
    expect(classifyDispatchConflict({ dimension: 'task', value: 'task-1' })).toBe(
      'JOIN_EXISTING'
    );
    expect(
      classifyDispatchConflict({ dimension: 'conflict', value: 'revenue/consumer' })
    ).toBe('CONFLICT_BLOCKED');
    expect(
      classifyDispatchConflict({ dimension: 'semantic', value: 'same capability' })
    ).toBe('CONFLICT_BLOCKED');
    expect(classifyDispatchConflict({ dimension: 'path', value: 'apps/api' })).toBe(
      'CONFLICT_BLOCKED'
    );
  });
});
