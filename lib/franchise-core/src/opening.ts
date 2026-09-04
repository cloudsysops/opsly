import { type OpeningChecklist, type OpeningPhase, type OpeningTask, type OpeningTaskStatus } from './types.js';

const PHASES: readonly OpeningPhase[] = ['contract', 'territory', 'location', 'design', 'permits', 'equipment', 'staff', 'training', 'soft_launch', 'opening'];
const TITLES: Record<OpeningPhase, string> = {
  contract: 'Contract ready', territory: 'Territory assigned', location: 'Location confirmed', design: 'Design approved',
  permits: 'Permits complete', equipment: 'Equipment ready', staff: 'Staff hired', training: 'Training complete',
  soft_launch: 'Soft launch complete', opening: 'Opening complete',
};

export function defaultOpeningTasks(input: { tenantId: string; checklistId: string; unitId?: string; createdAt?: string }): OpeningTask[] {
  const createdAt = input.createdAt ?? new Date(0).toISOString();
  return PHASES.map((phase, index) => ({
    id: `${input.checklistId}:${phase}`,
    tenantId: input.tenantId,
    checklistId: input.checklistId,
    unitId: input.unitId ?? `${input.checklistId}:unit`,
    phase,
    name: TITLES[phase],
    owner: null,
    dueDate: null,
    required: index < 8,
    status: 'todo' as OpeningTaskStatus,
    evidence: null,
    createdAt,
  }));
}

export function openingBlockers(tasks: readonly OpeningTask[]): OpeningTask[] {
  return tasks.filter((task) => task.required && task.status !== 'done');
}

export function canActivateUnit(input: { tasks: readonly OpeningTask[] }): boolean {
  return openingBlockers(input.tasks).length === 0;
}

export function assembleOpeningChecklist(input: { id: string; tenantId: string; unitId: string; phase?: OpeningPhase; status?: OpeningChecklist['status']; createdAt?: string }): OpeningChecklist {
  return { id: input.id, tenantId: input.tenantId, unitId: input.unitId, phase: input.phase ?? 'contract', status: input.status ?? 'not_started', createdAt: input.createdAt ?? new Date(0).toISOString(), updatedAt: null };
}
