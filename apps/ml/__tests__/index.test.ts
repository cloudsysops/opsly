import { describe, expect, it } from 'vitest';
import { storeEmbedding } from '../src/embeddings.js';

describe('ml index', () => {
  it('storeEmbedding resuelve sin lanzar', async () => {
    await expect(
      storeEmbedding('tenant-demo', 'contenido', { source: 'test' })
    ).resolves.toBeUndefined();
  });
});
