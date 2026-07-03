export type IcsoDealStage =
  | 'prospecting'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export const ICSO_DEAL_STAGES: IcsoDealStage[] = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

export const ICSO_STAGE_ORDER: Record<IcsoDealStage, number> = {
  prospecting: 0,
  qualification: 1,
  proposal: 2,
  negotiation: 3,
  won: 4,
  lost: 4,
};

export function isValidStageTransition(
  current: IcsoDealStage,
  next: IcsoDealStage
): boolean {
  if (current === next) {
    return false;
  }
  if (next === 'lost') {
    return current !== 'won';
  }
  if (current === 'won' || current === 'lost') {
    return false;
  }
  return ICSO_STAGE_ORDER[next] > ICSO_STAGE_ORDER[current];
}
