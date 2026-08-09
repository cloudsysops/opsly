/**
 * Visual funnel stages for Peskids admin lead cards (not CRM columns).
 */

export type LeadAdminStatus =
  | 'new'
  | 'contacted'
  | 'trial'
  | 'enrolled'
  | 'active'
  | 'renewal'
  | 'archived';

export type LeadPipelineStageId = 'new' | 'contacted' | 'trial' | 'enrolled';

export type LeadPipelineStage = {
  id: LeadPipelineStageId;
  label: string;
};

export const LEAD_PIPELINE_STAGES: readonly LeadPipelineStage[] = [
  { id: 'new', label: 'Nuevo' },
  { id: 'contacted', label: 'Contactado' },
  { id: 'trial', label: 'Prueba' },
  { id: 'enrolled', label: 'Matriculado' },
] as const;

export type LeadPipelineStepState = 'done' | 'current' | 'upcoming' | 'skipped';

export type LeadPipelineProgress = {
  stages: readonly LeadPipelineStage[];
  /** Index of current stage in LEAD_PIPELINE_STAGES; -1 when archived. */
  currentIndex: number;
  states: LeadPipelineStepState[];
  archived: boolean;
};

function statusToIndex(status: LeadAdminStatus): number {
  switch (status) {
    case 'new':
      return 0;
    case 'contacted':
      return 1;
    case 'trial':
      return 2;
    case 'enrolled':
    case 'active':
    case 'renewal':
      return 3;
    case 'archived':
      return -1;
    default:
      return 0;
  }
}

/** Build step states for the horizontal status timeline on lead cards. */
export function buildLeadPipelineProgress(status: LeadAdminStatus): LeadPipelineProgress {
  const archived = status === 'archived';
  const currentIndex = statusToIndex(status);
  const states: LeadPipelineStepState[] = LEAD_PIPELINE_STAGES.map((_, index) => {
    if (archived) return 'skipped';
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  });

  return {
    stages: LEAD_PIPELINE_STAGES,
    currentIndex,
    states,
    archived,
  };
}

export const LEAD_STATUS_LABEL: Record<LeadAdminStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  trial: 'Clase de prueba',
  enrolled: 'Matriculado',
  active: 'Activo',
  renewal: 'Renovación',
  archived: 'Archivado',
};

export type LeadStatusTone = 'green' | 'amber' | 'violet' | 'neutral' | 'coral';

export function leadStatusTone(status: LeadAdminStatus): LeadStatusTone {
  if (status === 'enrolled' || status === 'active' || status === 'renewal') return 'green';
  if (status === 'trial') return 'violet';
  if (status === 'archived') return 'neutral';
  if (status === 'contacted') return 'amber';
  return 'coral';
}
