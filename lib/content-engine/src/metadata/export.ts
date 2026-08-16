import type { ContentProject } from '../domain/types.js';

export interface YouTubeMetadata {
  title: string;
  description: string;
  tags: string[];
  privacyStatus: 'private' | 'unlisted' | 'public';
}

/**
 * Builds YouTube upload metadata for manual/future-automated publishing.
 * Always defaults privacyStatus to "unlisted" — this module never publishes
 * automatically and never defaults to "public".
 */
export function buildYouTubeMetadata(
  project: ContentProject,
  options: { description?: string; tags?: string[] } = {}
): YouTubeMetadata {
  return {
    title: project.title,
    description: options.description ?? `${project.series} — Episode ${project.episode}\n\n${project.goal}`,
    tags: options.tags ?? [project.channel, project.series].filter(Boolean),
    privacyStatus: 'unlisted',
  };
}
