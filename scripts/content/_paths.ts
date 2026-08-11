import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Repo root, resolved from this file's location (scripts/content/_paths.ts). */
export const REPO_ROOT = join(__dirname, '..', '..');

export const CONTENT_ROOT = join(REPO_ROOT, 'data', 'content');
export const CHARACTERS_DIR = join(CONTENT_ROOT, 'characters');
export const SERIES_DIR = join(CONTENT_ROOT, 'series');
export const DEFAULT_CAMPAIGN_JSON = join(
  CONTENT_ROOT,
  'campaigns',
  'opsly-channel-launch-30-days',
  'campaign.json'
);
