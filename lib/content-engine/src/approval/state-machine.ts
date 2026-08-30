import type { ContentProject, ProjectApproval } from '../domain/types.js';
import { saveProject, transitionProjectStatus } from '../storage/project-store.js';

export class NotReadyForReviewError extends Error {
  constructor(projectId: string, status: string) {
    super(`Project "${projectId}" is not ready_for_review (status: ${status}) — cannot approve/reject`);
    this.name = 'NotReadyForReviewError';
  }
}

/** Marks a project ready_for_review (typically called right after a successful render). */
export function markReadyForReview(project: ContentProject): ContentProject {
  const updated = transitionProjectStatus(project, 'ready_for_review');
  const withApproval: ContentProject = { ...updated, approval: { status: 'ready_for_review' } };
  saveProject(withApproval);
  return withApproval;
}

/** Approves a project — the only path toward `published`. Never publishes by itself. */
export function approveProject(project: ContentProject, approvedBy: string, reviewNotes?: string): ContentProject {
  if (project.status !== 'ready_for_review') {
    throw new NotReadyForReviewError(project.id, project.status);
  }
  const approval: ProjectApproval = {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString(),
    reviewNotes,
  };
  const updated = transitionProjectStatus(project, 'approved');
  const withApproval: ContentProject = { ...updated, approval };
  saveProject(withApproval);
  return withApproval;
}

/** Rejects a project — sends it back to assets_pending for rework, recording notes. */
export function rejectProject(project: ContentProject, reviewNotes: string): ContentProject {
  if (project.status !== 'ready_for_review') {
    throw new NotReadyForReviewError(project.id, project.status);
  }
  const approval: ProjectApproval = { status: 'rejected', reviewNotes };
  const updated = transitionProjectStatus(project, 'assets_pending');
  const withApproval: ContentProject = { ...updated, approval };
  saveProject(withApproval);
  return withApproval;
}
