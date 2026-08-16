import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { Series } from '../types.js';
import { SeriesSchema } from './schema.js';

export interface SeriesRegistryOptions {
  /** Directory containing one subdirectory per series, each with series.json (default: content/series). */
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

export function loadSeries(seriesJsonPath: string): Series {
  const parsed = SeriesSchema.safeParse(readJson(seriesJsonPath));
  if (!parsed.success) {
    throw new Error(
      `Series validation failed for ${seriesJsonPath}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }
  return parsed.data;
}

export function loadAllSeries(options: SeriesRegistryOptions): Series[] {
  const entries = readdirSync(options.seriesDir).filter((entry) =>
    statSync(join(options.seriesDir, entry)).isDirectory()
  );
  return entries
    .map((dir) => loadSeries(join(options.seriesDir, dir, 'series.json')))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export class SeriesRegistry {
  private readonly seriesDir: string;
  private cache: Map<string, Series> | null = null;

  constructor(options: SeriesRegistryOptions) {
    this.seriesDir = options.seriesDir;
  }

  private ensureLoaded(): Map<string, Series> {
    if (!this.cache) {
      const all = loadAllSeries({ seriesDir: this.seriesDir });
      this.cache = new Map(all.map((s) => [s.id, s]));
    }
    return this.cache;
  }

  getAll(): Series[] {
    return Array.from(this.ensureLoaded().values());
  }

  getById(id: string): Series | undefined {
    return this.ensureLoaded().get(id);
  }

  requireById(id: string): Series {
    const series = this.getById(id);
    if (!series) {
      throw new Error(`Series not found: ${id}`);
    }
    return series;
  }
}
