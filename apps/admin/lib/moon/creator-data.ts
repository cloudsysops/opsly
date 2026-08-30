import {
  assertSameTenant,
  brandKitFromPreset,
  evaluateRightsGate,
  listAllTrendCandidates,
  listProjectEnvelopes,
  loadAllContentChannelPresets,
  loadContentCharacters,
  loadContentFormats,
  loadContentPortals,
  loadProjectEnvelopeByTenant,
  saveProjectEnvelope,
  setProjectApproval,
  type ContentProjectEnvelope,
  type ContentProjectStatus,
} from '@intcloudsysops/content-studio/studio';

export const CREATOR_TABS = [
  'overview',
  'ideas',
  'trends',
  'productions',
  'clips',
  'characters',
  'brands',
  'calendar',
  'approvals',
  'analytics',
] as const;

export type CreatorTab = (typeof CREATOR_TABS)[number];

const KANBAN: Record<string, ContentProjectStatus[]> = {
  IDEAS: ['idea'],
  RESEARCH: ['research'],
  SCRIPT: ['script', 'storyboard', 'drafting'],
  ASSETS: ['assets', 'assets_pending', 'edit'],
  RENDER: ['render', 'ready_to_render', 'rendering', 'qa'],
  REVIEW: ['rights_review', 'human_review', 'ready_for_review'],
  APPROVED: ['approved', 'ready_to_publish'],
  PUBLISHED: ['published', 'measured'],
};

export function kanbanColumnFor(status: ContentProjectStatus): string {
  for (const [column, statuses] of Object.entries(KANBAN)) {
    if (statuses.includes(status)) return column;
  }
  return 'IDEAS';
}

export async function loadCreatorStudioData(): Promise<{
  projects: ContentProjectEnvelope[];
  trends: ReturnType<typeof listAllTrendCandidates>;
  portals: ReturnType<typeof loadContentPortals>;
  formats: ReturnType<typeof loadContentFormats>;
  characters: ReturnType<typeof loadContentCharacters>;
  brands: Array<{ channel: string; kit: ReturnType<typeof brandKitFromPreset> }>;
}> {
  const projects = await listProjectEnvelopes();
  const presets = await loadAllContentChannelPresets();
  return {
    projects,
    trends: listAllTrendCandidates(),
    portals: loadContentPortals(),
    formats: loadContentFormats(),
    characters: loadContentCharacters(),
    brands: presets.map((preset) => ({ channel: preset.channel, kit: brandKitFromPreset(preset) })),
  };
}

export async function approveCreatorProject(
  tenantId: string,
  projectId: string,
  reviewer: string
): Promise<void> {
  const envelope = await loadProjectEnvelopeByTenant(tenantId, projectId);
  assertSameTenant(envelope, tenantId);
  const rights = evaluateRightsGate(envelope);
  if (rights.verdict === 'BLOCKED') {
    throw new Error(`RightsGate BLOCKED: ${rights.reasons.join('; ')}`);
  }
  const next = setProjectApproval(envelope, {
    state: 'approved',
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
    reviewNotes: `Moon human approval. Rights ${rights.verdict}`,
  });
  await saveProjectEnvelope(next);
}

export function parseCreatorTab(value: string | undefined): CreatorTab {
  return CREATOR_TABS.includes(value as CreatorTab) ? (value as CreatorTab) : 'overview';
}
