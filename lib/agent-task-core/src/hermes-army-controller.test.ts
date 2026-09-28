import { describe, expect, it } from 'vitest';
import {
  armyNodeDisposition,
  buildArmyNodeSubmitBody,
  buildHermesCommanderPrompt,
  inspectArmyGraph,
  parseHermesCommanderResult,
} from './hermes-army-controller.js';
import type { TaskGraphV1 } from './task-graph.js';

function graph(): TaskGraphV1 {
  return {
    version: 'task-graph-v1',
    goal: 'Ship Mission Control safely',
    nodes: [
      {
        id: 'architecture',
        title: 'Inspect existing Mission Control boundaries',
        workstream: 'mission-control.architecture',
        conflictKey: null,
        dependsOn: [],
        ownerRole: 'architecture',
        runtimeCapabilities: ['architecture'],
        riskClass: 'low',
        costClass: 'zero',
        writeIntent: false,
        requiresApproval: false,
        acceptanceCriteria: ['Existing owners identified'],
        evidenceRequirements: ['Relevant files listed'],
      },
      {
        id: 'build',
        title: 'Implement the bounded change',
        workstream: 'mission-control.ui',
        conflictKey: 'apps/admin/mission-control',
        dependsOn: ['architecture'],
        ownerRole: 'implementation',
        runtimeCapabilities: ['code-edit'],
        riskClass: 'medium',
        costClass: 'zero',
        writeIntent: true,
        requiresApproval: false,
        acceptanceCriteria: ['Tests pass'],
        evidenceRequirements: ['PR and test evidence'],
      },
    ],
  };
}

describe('Hermes Army Controller', () => {
  it('parses a fenced Hermes TaskGraphV1 response', () => {
    const result = parseHermesCommanderResult({
      result: `\`\`\`json\n${JSON.stringify(graph())}\n\`\`\``,
    });
    expect(result.goal).toBe('Ship Mission Control safely');
    expect(result.nodes).toHaveLength(2);
  });

  it('requires conflict ownership for write-capable nodes', () => {
    const value = graph();
    value.nodes[1] = { ...value.nodes[1]!, conflictKey: null };
    expect(inspectArmyGraph(value)).toContainEqual({
      code: 'WRITE_CONFLICT_KEY_REQUIRED',
      nodeId: 'build',
    });
  });

  it('holds approval and paid nodes instead of silently dispatching them', () => {
    const value = graph();
    expect(
      armyNodeDisposition({ ...value.nodes[0]!, requiresApproval: true })
    ).toEqual({ status: 'held', reason: 'approval_required' });
    expect(
      armyNodeDisposition({ ...value.nodes[0]!, costClass: 'paid' })
    ).toEqual({ status: 'held', reason: 'paid' });
  });

  it('builds canonical prompt-submit input with claim metadata for writes', () => {
    const value = graph();
    const body = buildArmyNodeSubmitBody({
      objectiveId: 'objective-123',
      tenantSlug: 'platform',
      graph: value,
      node: value.nodes[1]!,
    });

    expect(body.agent).toBeNull();
    expect(body.agent_role).toBe('implementation');
    expect(body.request_id).toBe('objective-123:build');
    expect(body.context).toMatchObject({
      source: 'hermes-army-controller-v1',
      task_id: 'objective-123:build',
      workstream: 'mission-control.ui',
      conflict_key: 'apps/admin/mission-control',
      semantic_scope: 'apps/admin/mission-control',
      requires_pr: true,
    });
  });

  it('makes the commander planner-only and bounded', () => {
    const prompt = buildHermesCommanderPrompt({
      objective: 'Improve the software factory',
      maxNodes: 8,
    });
    expect(prompt).toContain('PLAN ONLY');
    expect(prompt).toContain('maximum nodes: 8');
    expect(prompt).toContain('one Opsly control plane');
    expect(prompt).toContain('return JSON only');
  });
});
