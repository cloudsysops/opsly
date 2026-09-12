import fs from 'node:fs/promises';
import path from 'node:path';
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
  enqueueApprovedPublishJobs,
  buildDistributionPackages,
  writeDistributionManifest,
  type ContentProjectEnvelope,
  type ContentProjectStatus,
  type PublishingPlatform,
} from '@intcloudsysops/content-studio/studio';


export interface AstralFranchiseEventView {
  id: string;
  title: string;
  episodeId: string;
  missionIds: string[];
  status: string;
  surfaces: string[];
  contentProjectStatus: string | null;
  episodeProductionStatus: string | null;
}

export interface AstralFranchiseChapterView {
  id: string;
  title: string;
  contentArc: string;
  status: string;
  events: AstralFranchiseEventView[];
}

export interface AstralFranchiseView {
  franchiseId: string;
  title: string;
  seasonId: string;
  seasonTitle: string;
  thesis: string;
  chapters: AstralFranchiseChapterView[];
  summary: {
    missions: number;
    episodes: number;
    contentProjects: number;
    publishedProjects: number;
  };
}

async function readRepoJson(relativePath: string): Promise<unknown> {
  const candidates = [
    process.env.OPSLY_REPO_ROOT,
    path.resolve(process.cwd(), '../..'),
    process.cwd(),
  ].filter((value): value is string => Boolean(value));

  for (const root of candidates) {
    try {
      return JSON.parse(await fs.readFile(path.join(root, relativePath), 'utf8'));
    } catch {
      // Try next root. Local monorepo and standalone container use different cwd values.
    }
  }
  throw new Error(`CREATOR_REPO_DATA_MISSING: ${relativePath}`);
}

async function loadAstralFranchiseView(
  projects: ContentProjectEnvelope[],
): Promise<AstralFranchiseView | null> {
  try {
    const manifest = (await readRepoJson('config/games/astral-arena-transmedia.json')) as {
      franchiseId: string;
      title: string;
      season: {
        id: string;
        title: string;
        thesis: string;
        surfaces: string[];
        chapters: Array<{
          id: string;
          title: string;
          contentArc: string;
          status: string;
          missionIds: string[];
        }>;
      };
      storyEvents: Array<{
        id: string;
        title: string;
        episodeId: string;
        missionIds: string[];
        status: string;
      }>;
    };

    const episodeProduction = new Map<string, string>();
    const seriesRoot = 'data/content/series/astral-arena/episodes';
    for (const event of manifest.storyEvents) {
      try {
        const entries = await Promise.all(
          ['001-awakening', '002-orion', '003-aurora', '004-nx7'].map(async (dir) => {
            const raw = (await readRepoJson(`${seriesRoot}/${dir}/episode.json`)) as {
              id: string;
              production?: { status?: string };
            };
            return raw;
          }),
        );
        for (const episode of entries) {
          episodeProduction.set(episode.id, episode.production?.status ?? 'unknown');
        }
        break;
      } catch {
        break;
      }
    }

    const eventByMission = new Map<string, (typeof manifest.storyEvents)[number]>();
    for (const event of manifest.storyEvents) {
      for (const missionId of event.missionIds) eventByMission.set(missionId, event);
    }

    const chapters = manifest.season.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      contentArc: chapter.contentArc,
      status: chapter.status,
      events: chapter.missionIds
        .map((missionId) => eventByMission.get(missionId))
        .filter((event): event is (typeof manifest.storyEvents)[number] => Boolean(event))
        .map((event) => {
          const project = projects.find(
            (item) =>
              item.transmedia?.storyEventId === event.id ||
              item.transmedia?.episodeId === event.episodeId ||
              item.project.episode === event.episodeId,
          );
          return {
            id: event.id,
            title: event.title,
            episodeId: event.episodeId,
            missionIds: event.missionIds,
            status: event.status,
            surfaces: manifest.season.surfaces,
            contentProjectStatus: project?.project.status ?? null,
            episodeProductionStatus: episodeProduction.get(event.episodeId) ?? null,
          };
        }),
    }));

    const franchiseProjects = projects.filter((item) => item.transmedia?.franchiseId === manifest.franchiseId);
    return {
      franchiseId: manifest.franchiseId,
      title: manifest.title,
      seasonId: manifest.season.id,
      seasonTitle: manifest.season.title,
      thesis: manifest.season.thesis,
      chapters,
      summary: {
        missions: manifest.season.chapters.reduce((sum, chapter) => sum + chapter.missionIds.length, 0),
        episodes: manifest.storyEvents.length,
        contentProjects: franchiseProjects.length,
        publishedProjects: franchiseProjects.filter((item) => item.project.status === 'published').length,
      },
    };
  } catch {
    return null;
  }
}

export const CREATOR_TABS = [
  'overview',
  'ideas',
  'trends',
  'productions',
  'clips',
  'franchise',
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
  franchise: AstralFranchiseView | null;
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
    franchise: await loadAstralFranchiseView(projects),
  };
}

export async function approveCreatorProject(
  tenantId: string,
  projectId: string,
  reviewer: string,
  platforms: PublishingPlatform[] = ['youtube']
): Promise<void> {
  const envelope = await loadProjectEnvelopeByTenant(tenantId, projectId);
  assertSameTenant(envelope, tenantId);
  const rights = evaluateRightsGate(envelope);
  if (rights.verdict === 'BLOCKED') {
    throw new Error(`RightsGate BLOCKED: ${rights.reasons.join('; ')}`);
  }
  const approved = setProjectApproval(envelope, {
    state: 'approved',
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
    reviewNotes: `Moon human approval. Rights ${rights.verdict}. Platforms ${platforms.join(',')}`,
  });
  const packaged = {
    ...approved,
    distributionPackages: buildDistributionPackages(approved),
  };
  writeDistributionManifest(packaged, packaged.distributionPackages ?? []);
  const next = enqueueApprovedPublishJobs(packaged, platforms.length ? platforms : ['youtube']);
  await saveProjectEnvelope(next);
}

export async function rejectCreatorProject(
  tenantId: string,
  projectId: string,
  reviewer: string,
  notes?: string
): Promise<void> {
  const envelope = await loadProjectEnvelopeByTenant(tenantId, projectId);
  assertSameTenant(envelope, tenantId);
  const next = setProjectApproval(envelope, {
    state: 'rejected',
    approvedBy: reviewer,
    approvedAt: new Date().toISOString(),
    reviewNotes: notes ?? 'Moon human rejection',
  });
  await saveProjectEnvelope(next);
}

export function parseCreatorTab(value: string | undefined): CreatorTab {
  return CREATOR_TABS.includes(value as CreatorTab) ? (value as CreatorTab) : 'overview';
}
