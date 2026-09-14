import { describe, expect, it } from 'vitest';
import { parsePsResourceOutput } from '../workers/process-resource-usage.js';

describe('process resource usage', () => {
  it('parses ps cpu, rss and elapsed time', () => {
    expect(parsePsResourceOutput(42, ' 12.5 204800 00:03:21\n')).toEqual({
      pid: 42,
      cpu_pct: 12.5,
      rss_mb: 200,
      elapsed: '00:03:21',
    });
  });

  it('keeps unavailable process metrics unknown instead of zero', () => {
    expect(parsePsResourceOutput(42, '')).toEqual({
      pid: 42,
      cpu_pct: null,
      rss_mb: null,
      elapsed: null,
    });
  });
});
