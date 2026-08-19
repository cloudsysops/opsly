import { OPENING_PHASES, type OpeningChecklist, type OpeningPhase, type OpeningTask } from './types.js';

const PHASE_TITLES: Record<OpeningPhase, string> = {
  contract: 'Contract executed',
  territory: 'Territory assigned',
  location: 'Location confirmed',
  design: 'Design approved',
  permits: 'Permits complete',
  equipment: 'Equipment ready',
  staff: 'Staff hired',
  training: 'Training complete',
  soft_launch: 'Soft launch done',
  opening: 'Grand opening',
};

export function defaultOpeningTasks(input: {
  tenantId: string;
  checklistId: string;
}): OpeningTask[] {
  return OPENING_PHASES.map((phase, index) => ({
    id: `${input.checklistId}:${phase}`,
    tenantId: input.tenantId,
    checklistId: input.checklistId,
    phase,
    title: PHASE_TITLES[phase],
    owner: null,
    dueDate: null,
    required: index < 8,
    status: 'not_started',
    evidence: null,
  }));
}

export function openingBlockers(checklist: OpeningChecklist): OpeningTask[] {
  return checklist.tasks.filter((task) => task.required && task.status !== 'completed' && task.status !== 'skipped');
}

export function canActivateUnit(checklist: OpeningChecklist): boolean {
  return openingBlockers(checklist).length === 0;
}
