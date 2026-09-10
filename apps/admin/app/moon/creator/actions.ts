'use server';

import { approveCreatorProject, rejectCreatorProject } from '@/lib/moon/creator-data';
import { revalidatePath } from 'next/cache';

export async function approveCreatorProjectAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!tenantId || !projectId) {
    throw new Error('tenantId and projectId required');
  }
  await approveCreatorProject(tenantId, projectId, 'moon-human');
  revalidatePath('/moon/creator');
}

export async function rejectCreatorProjectAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!tenantId || !projectId) {
    throw new Error('tenantId and projectId required');
  }
  await rejectCreatorProject(
    tenantId,
    projectId,
    'moon-human',
    'Rejected from Moon Creator Studio'
  );
  revalidatePath('/moon/creator');
}
