import type { ContentProjectStatus } from './types.js';

const transitions: Record<ContentProjectStatus, ContentProjectStatus[]> = {
  idea: ['drafting'],
  drafting: ['assets_pending', 'ready_to_render'],
  assets_pending: ['ready_to_render'],
  ready_to_render: ['rendering', 'failed'],
  rendering: ['ready_for_review', 'failed'],
  ready_for_review: ['approved', 'failed'],
  approved: ['published', 'archived'],
  published: ['archived'],
  failed: ['archived'],
  archived: ['archived'],
};

export function canTransitionContentProjectStatus(
  from: ContentProjectStatus,
  to: ContentProjectStatus
): boolean {
  return transitions[from].includes(to);
}

export function transitionContentProjectStatus(
  from: ContentProjectStatus,
  to: ContentProjectStatus
): ContentProjectStatus {
  if (!canTransitionContentProjectStatus(from, to)) {
    throw new Error(`Invalid content project transition: ${from} -> ${to}`);
  }
  return to;
}

export function contentProjectStatusPath(): Record<ContentProjectStatus, ContentProjectStatus[]> {
  return transitions;
}
