import { describe, expect, it } from 'vitest';
import { ContextPackSchema } from '@intcloudsysops/types';

describe('ContextPackSchema', () => {
  it('acepta un pack mínimo válido', () => {
    const parsed = ContextPackSchema.parse({
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      tenant_slug: 'acme',
      generated_at: new Date().toISOString(),
      identity: { name: 'Acme' },
      knowledge: {},
      state: {},
    });
    expect(parsed.tenant_slug).toBe('acme');
    expect(parsed.identity.name).toBe('Acme');
  });
});
