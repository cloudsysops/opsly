import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

describe('ai-integrations tools', () => {
  it('list_ai_integrations devuelve catálogo sin snapshots', async () => {
    const server = createServer();
    const out = (await server.callTool('list_ai_integrations', {})) as {
      integrations: { id: string }[];
    };
    expect(Array.isArray(out.integrations)).toBe(true);
    expect(out.integrations.some((i) => i.id === 'cursor_via_github_prompt')).toBe(true);
  });
});
