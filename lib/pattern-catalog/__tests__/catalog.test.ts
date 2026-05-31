import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyHarnessPattern,
  clearPatternCache,
  enrichTenantProfile,
  listPatterns,
  validatePatternIndex,
} from '../src/index.js';

const FIXTURE_ROOT = path.join(process.cwd(), '__fixtures__', 'repo');

describe('pattern catalog', () => {
  afterEach(() => {
    clearPatternCache();
  });

  it('validates fixture index', () => {
    const errors = validatePatternIndex(FIXTURE_ROOT);
    expect(errors).toEqual([]);
  });

  it('lists harness patterns', () => {
    const harness = listPatterns('harness', FIXTURE_ROOT);
    expect(harness.length).toBe(1);
    expect(harness[0]?.id).toBe('test-harness');
  });

  it('applyHarnessPattern adds topic prefix and reviewers', () => {
    const applied = applyHarnessPattern({
      patternId: 'test-harness',
      topic: 'deploy peskids',
      summary: 'bump env OPENWA_PESKIDS',
      repoRoot: FIXTURE_ROOT,
    });
    expect(applied?.topic).toBe('[test] deploy peskids');
    expect(applied?.reviewers).toHaveLength(2);
    expect(applied?.sigmaSearchText).toContain('webhook');
  });

  it('enrichTenantProfile merges capabilities', () => {
    const enriched = enrichTenantProfile(
      { tenant_slug: 'demo', pattern_ids: ['test-tenant'] },
      FIXTURE_ROOT
    );
    expect(enriched.capabilities).toContain('openwa');
    expect(enriched.harness_patterns).toContain('test-harness');
  });
});
