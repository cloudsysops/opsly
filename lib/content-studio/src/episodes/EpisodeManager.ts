import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Episode } from '../types.js';
import { EpisodeSchema } from './schema.js';
import { performFullCompliance, type ComplianceResult } from '../checkers/compliance-checker.js';

export interface EpisodeManagerOptions {
  /** Directory containing series subdirectories, each with an episodes folder of episode.json files (default: content/series). */
  seriesDir: string;
}

function readJson(path: string): unknown {
  const raw = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${(error as Error).message}`);
  }
}

export function loadEpisode(episodeJsonPath: string): Episode {
  const parsed = EpisodeSchema.safeParse(readJson(episodeJsonPath));
  if (!parsed.success) {
    throw new Error(
      `Episode validation failed for ${episodeJsonPath}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }
  return parsed.data;
}

/** Read the episode's script.md alongside episode.json, if present. */
export function loadEpisodeScript(episodeDir: string): string | undefined {
  const scriptPath = join(episodeDir, 'script.md');
  if (!existsSync(scriptPath)) return undefined;
  return readFileSync(scriptPath, 'utf-8');
}

export function loadAllEpisodesForSeries(seriesEpisodesDir: string): Episode[] {
  if (!existsSync(seriesEpisodesDir)) return [];
  const dirs = readdirSync(seriesEpisodesDir).filter((entry) =>
    statSync(join(seriesEpisodesDir, entry)).isDirectory()
  );
  return dirs
    .map((dir) => loadEpisode(join(seriesEpisodesDir, dir, 'episode.json')))
    .sort((a, b) => a.episode_number - b.episode_number);
}

export function loadAllEpisodes(options: EpisodeManagerOptions): Episode[] {
  const seriesDirs = readdirSync(options.seriesDir).filter((entry) =>
    statSync(join(options.seriesDir, entry)).isDirectory()
  );
  const episodes: Episode[] = [];
  for (const seriesId of seriesDirs) {
    const episodesDir = join(options.seriesDir, seriesId, 'episodes');
    episodes.push(...loadAllEpisodesForSeries(episodesDir));
  }
  return episodes.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Compliance check for an episode's textual content (title, hook, scenes, CTA, captions).
 * Reuses the same secret/PII pattern checks as ContentDraft compliance.
 */
export function checkEpisodeCompliance(episode: Episode): ComplianceResult {
  const text = [
    episode.title.es,
    episode.title.en,
    episode.hook.es,
    episode.hook.en,
    episode.objective,
    episode.metadata.call_to_action,
    episode.metadata.captions.es,
    episode.metadata.captions.en,
    ...episode.scenes.map((s) => `${s.description} ${s.visuals} ${s.copy}`),
  ].join('\n');

  return performFullCompliance({
    story_hook: text,
    title: episode.title.es,
    call_to_action: episode.metadata.call_to_action,
    image_prompt: episode.metadata.thumbnail_concept,
  });
}

export class EpisodeManager {
  private readonly seriesDir: string;
  private cache: Episode[] | null = null;

  constructor(options: EpisodeManagerOptions) {
    this.seriesDir = options.seriesDir;
  }

  private ensureLoaded(): Episode[] {
    if (!this.cache) {
      this.cache = loadAllEpisodes({ seriesDir: this.seriesDir });
    }
    return this.cache;
  }

  list(): Episode[] {
    return this.ensureLoaded();
  }

  listBySeries(seriesId: string): Episode[] {
    return this.ensureLoaded().filter((e) => e.series_id === seriesId);
  }

  getById(id: string): Episode | undefined {
    return this.ensureLoaded().find((e) => e.id === id);
  }

  requireById(id: string): Episode {
    const episode = this.getById(id);
    if (!episode) {
      throw new Error(`Episode not found: ${id}`);
    }
    return episode;
  }

  validateAll(): { episode: Episode; compliance: ComplianceResult }[] {
    return this.ensureLoaded().map((episode) => ({
      episode,
      compliance: checkEpisodeCompliance(episode),
    }));
  }
}
