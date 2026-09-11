'use server';

import { approveCreatorProject, rejectCreatorProject } from '@/lib/moon/creator-data';
import { publishingPlatformValues, type PublishingPlatform } from '@intcloudsysops/content-studio/studio';
import { revalidatePath } from 'next/cache';

function selectedPlatforms(formData: FormData): PublishingPlatform[] {
  const selected = publishingPlatformValues.filter((platform) => formData.get(`platform_${platform}`) === 'on');
  return selected.length ? selected : ['youtube'];
}

export async function approveCreatorProjectAction(formData: FormData): Promise<void> {
  const tenantId = String(formData.get('tenantId') ?? '');
  const projectId = String(formData.get('projectId') ?? '');
  if (!tenantId || !projectId) {
    throw new Error('tenantId and projectId required');
  }
  await approveCreatorProject(tenantId, projectId, 'moon-human', selectedPlatforms(formData));
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
