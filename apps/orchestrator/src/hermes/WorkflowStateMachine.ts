import type { WorkflowStep } from '@intcloudsysops/types';

export type WorkflowRunStatus = 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

export interface WorkflowContext {
  workflow_id: string;
  step_results: Record<string, 'ok' | 'failed'>;
}

/**
 * Máquina de estados mínima: pasos secuenciales y ramas paralelas declarativas.
 */
export class WorkflowStateMachine {
  canRunStep(step: WorkflowStep, ctx: WorkflowContext): boolean {
    if (step.depends_on.length === 0) {
      return true;
    }
    return step.depends_on.every((dep) => ctx.step_results[dep] === 'ok');
  }

  nextSequentialIndex(steps: WorkflowStep[], ctx: WorkflowContext): number | null {
    for (let i = 0; i < steps.length; i += 1) {
      const s = steps[i];
      if (s === undefined) {
        continue;
      }
      if (ctx.step_results[s.id]) {
        continue;
      }
      if (this.canRunStep(s, ctx)) {
        return i;
      }
    }
    return null;
  }
}
