import { randomUUID } from 'node:crypto';

/** Slugifies a title into a URL/path-safe identifier segment. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Builds a stable project id from series + a zero-padded sequence number. */
export function buildProjectId(seriesSlug: string, sequence: number): string {
  return `${seriesSlug}-${String(sequence).padStart(3, '0')}`;
}

export function newAssetId(): string {
  return `asset_${randomUUID()}`;
}

export function newRenderJobId(): string {
  return `render_${randomUUID()}`;
}

export function newSceneId(order: number): string {
  return `scene_${String(order).padStart(2, '0')}`;
}
