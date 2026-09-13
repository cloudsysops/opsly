import type { ContentProjectEnvelope } from './types.js';

export const transmediaSurfaceValues = [
  'GAME',
  'STORY_EPISODE',
  'YOUTUBE_LONG',
  'SHORT',
  'TRAILER',
  'STEAM_STORE',
  'SOCIAL',
  'LORE',
] as const;
export type TransmediaSurface = (typeof transmediaSurfaceValues)[number];

export const continuityStatusValues = ['CANON', 'CANON_ADJACENT', 'PROMO'] as const;
export type ContinuityStatus = (typeof continuityStatusValues)[number];

export interface TransmediaBinding {
  franchiseId: string;
  seasonId: string;
  chapterId?: string;
  storyEventId: string;
  missionIds: string[];
  episodeId?: string;
  characterIds: string[];
  companionIds: string[];
  worldIds: string[];
  surfaces: TransmediaSurface[];
  continuity: ContinuityStatus;
  source: 'gameplay' | 'scripted_story' | 'mixed';
  gameplayBuildSha?: string;
  captureMarkers?: string[];
}

export function bindTransmediaContext(
  envelope: ContentProjectEnvelope,
  binding: TransmediaBinding,
): ContentProjectEnvelope {
  if (!binding.franchiseId.trim()) throw new Error('TRANSMEDIA_FRANCHISE_REQUIRED');
  if (!binding.seasonId.trim()) throw new Error('TRANSMEDIA_SEASON_REQUIRED');
  if (!binding.storyEventId.trim()) throw new Error('TRANSMEDIA_STORY_EVENT_REQUIRED');
  if (binding.surfaces.length === 0) throw new Error('TRANSMEDIA_SURFACE_REQUIRED');

  return {
    ...envelope,
    transmedia: {
      ...binding,
      missionIds: [...new Set(binding.missionIds)],
      characterIds: [...new Set(binding.characterIds)],
      companionIds: [...new Set(binding.companionIds)],
      worldIds: [...new Set(binding.worldIds)],
      surfaces: [...new Set(binding.surfaces)],
      captureMarkers: binding.captureMarkers
        ? [...new Set(binding.captureMarkers)]
        : undefined,
    },
    project: {
      ...envelope.project,
      updatedAt: new Date().toISOString(),
    },
  };
}
