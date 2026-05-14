import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setModeTool } from '../set-mode.tool.js';

const mockSetActiveMode = vi.fn();

vi.mock('../../modes/middleware.js', () => ({
  setActiveMode: (...args: unknown[]) => mockSetActiveMode(...args),
  resolveModeContext: vi.fn(),
  clearMode: vi.fn(),
  ModePlanError: class extends Error {},
  ModeNotFoundError: class extends Error {},
}));

vi.mock('../../modes/registry.js', async () => {
  const actual = await vi.importActual<typeof import('../../modes/registry.js')>('../../modes/registry.js');
  return {
    ...actual,
    getAvailableModes: vi.fn(() => ['developer', 'quantum']),
  };
});

describe('set_mode tool', () => {
  beforeEach(() => {
    mockSetActiveMode.mockReset();
    mockSetActiveMode.mockResolvedValue(undefined);
  });

  it('calls setActiveMode with parsed args', async () => {
    const out = await setModeTool.handler({
      session_id: 'sess-a',
      mode: 'quantum',
      tenant_plan: 'enterprise',
    });
    expect(mockSetActiveMode).toHaveBeenCalledWith('sess-a', 'quantum', 'enterprise');
    expect(out).toMatchObject({
      ok: true,
      mode: 'quantum',
      session_id: 'sess-a',
    });
  });
});
