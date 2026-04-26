import { describe, expect, it } from 'vitest';
import { searchInIndex } from '../src/indexer.js';
import type { KnowledgeIndexFile } from '../src/knowledge-index.js';

describe('searchInIndex', () => {
  const index: KnowledgeIndexFile = {
    version: 1,
    root: '/repo',
    generated_at: '',
    topics: { onboarding: ['docs/ONBOARDING.md'] },
    files: [
      {
        path: 'docs/ONBOARDING.md',
        title: 'Onboarding de tenants',
        keywords: ['onboarding', 'tenant', 'opsly'],
        size_bytes: 100,
      },
      {
        path: 'VISION.md',
        title: 'Visión',
        keywords: ['vision', 'roadmap', 'opsly'],
        size_bytes: 200,
      },
    ],
  };

  it('encuentra por keyword y título', () => {
    const hits = searchInIndex(index, 'onboarding tenant');
    expect(hits.map((h) => h.path)).toContain('docs/ONBOARDING.md');
  });

  it('encuentra por ruta parcial', () => {
    const hits = searchInIndex(index, 'VISION');
    expect(hits.some((h) => h.path === 'VISION.md')).toBe(true);
  });
});
