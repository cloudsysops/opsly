import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SeriesRegistry, loadSeries } from '../SeriesRegistry.js';
import type { Series } from '../../types.js';

const validSeries: Series = {
  id: 'opsly-origins',
  name: 'Opsly Origins',
  description: 'The origin story of Opsly',
  theme: 'founder journey',
  audience: ['founders'],
  typical_duration_sec: 60,
  characters: ['opsly-founder', 'opsly-robot-luna'],
  brand: 'opsly',
  episode_count: 4,
  created_at: '2026-08-01T00:00:00Z',
};

describe('SeriesRegistry', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'opsly-series-'));
    mkdirSync(join(dir, 'opsly-origins'));
    writeFileSync(join(dir, 'opsly-origins', 'series.json'), JSON.stringify(validSeries));
  });

  it('loads a valid series.json', () => {
    const series = loadSeries(join(dir, 'opsly-origins', 'series.json'));
    expect(series.id).toBe('opsly-origins');
    expect(series.characters).toContain('opsly-founder');
  });

  it('registry lists all series in a directory', () => {
    const registry = new SeriesRegistry({ seriesDir: dir });
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.requireById('opsly-origins').brand).toBe('opsly');
    expect(() => registry.requireById('missing')).toThrow(/Series not found/);
  });
});
