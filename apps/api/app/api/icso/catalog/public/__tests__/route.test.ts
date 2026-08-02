import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../../lib/services/icso-catalog.service', () => ({
  readCatalog: vi.fn(),
}));

import { readCatalog } from '../../../../../../lib/services/icso-catalog.service';
import { GET } from '../route';

const sampleCatalog = {
  version: '1.0.0',
  updated: '2026-08-01',
  owner: 'icso',
  currency: 'USD',
  disclaimer: 'Disclaimer',
  source_docs: ['docs/example.md'],
  sales_pitch_es: 'Pitch',
  repeat_commands: { list: 'echo' },
  modules: [
    {
      id: 'lead-capture',
      label: 'Lead Capture',
      label_es: 'Captura',
      mvp_default: true,
      risk: 'low',
      summary: 'Forms',
    },
  ],
  packages: [],
  verticals: [],
};

describe('GET /api/icso/catalog/public', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 without auth and exposes catalog only', async () => {
    vi.mocked(readCatalog).mockReturnValue({ catalog: sampleCatalog, etag: 'hidden-etag' });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ catalog: sampleCatalog });
    expect(body).not.toHaveProperty('etag');
  });
});
