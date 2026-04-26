import { describe, expect, it } from 'vitest';
import { selectPathsForQuery } from '../src/knowledge-index.js';
import type { KnowledgeIndexFile } from '../src/knowledge-index.js';

describe('selectPathsForQuery', () => {
  const index: KnowledgeIndexFile = {
    version: 1,
    root: '/tmp',
    generated_at: '',
    topics: {
      onboarding: ['docs/ONBOARDING.md', 'AGENTS.md'],
      vision: ['VISION.md'],
      deploy: ['docs/DEPLOY.md'],
    },
    files: ['AGENTS.md', 'VISION.md', 'docs/DEPLOY.md', 'docs/ONBOARDING.md'],
  };

  it('elige rutas que coinciden con tokens de la consulta', () => {
    const paths = selectPathsForQuery(index, 'How does onboarding work with vision?');
    expect(paths).toContain('docs/ONBOARDING.md');
    expect(paths).toContain('AGENTS.md');
    expect(paths).toContain('VISION.md');
  });

  it('si no hay coincidencia, usa lista files como fallback', () => {
    const paths = selectPathsForQuery(
      {
        ...index,
        topics: {},
      },
      'zzz unknown token xyz'
    );
    expect(paths.length).toBeGreaterThan(0);
  });
});
