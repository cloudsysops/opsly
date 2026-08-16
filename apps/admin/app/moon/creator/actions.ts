'use server';

import { revalidatePath } from 'next/cache';
import { approveProject, loadProject, rejectProject } from '@intcloudsysops/content-engine';

/**
 * Approve/reject actions for the Moon Creator review queue. Both call
 * content-engine's real approval state machine directly (no HTTP hop —
 * apps/admin and lib/content-engine share the same local filesystem in this
 * local-first V1). Never publishes — approval only moves a project to
 * `approved`; publishing remains a separate, unimplemented step by design.
 */
export async function approveContentProject(projectId: string, approvedBy: string): Promise<void> {
  const project = loadProject(projectId);
  approveProject(project, approvedBy || 'moon-ui');
  revalidatePath(`/moon/creator/${projectId}`);
  revalidatePath('/moon/creator');
}

export async function rejectContentProject(projectId: string, reviewNotes: string): Promise<void> {
  const project = loadProject(projectId);
  rejectProject(project, reviewNotes || '(no notes provided)');
  revalidatePath(`/moon/creator/${projectId}`);
  revalidatePath('/moon/creator');
}
