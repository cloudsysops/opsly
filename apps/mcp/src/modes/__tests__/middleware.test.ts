import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BUILT_IN_MODES } from '../registry.js';
import {
  clearMode,
  ModeNotFoundError,
  ModePlanError,
  resolveModeContext,
  setActiveMode,
} from '../middleware.js';

const mockGet = vi.fn();
const mockSetEx = vi.fn();
const mockDel = vi.fn();

vi.mock('@intcloudsysops/llm-gateway/cache', () => ({
  getRedisClient: vi.fn(async () => ({
    get: mockGet,
    setEx: mockSetEx,
    del: mockDel,
  })),
}));

describe('modes middleware', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSetEx.mockReset();
    mockDel.mockReset();
  });

  it('resolveModeContext defaults to developer when Redis empty', async () => {
    mockGet.mockResolvedValueOnce(null);
    const ctx = await resolveModeContext('sess-1');
    expect(ctx.modeId).toBe('developer');
    expect(ctx.definition).toEqual(BUILT_IN_MODES.developer);
  });

  it('resolveModeContext uses Redis value when valid', async () => {
    mockGet.mockResolvedValueOnce('ops');
    const ctx = await resolveModeContext('sess-2');
    expect(ctx.modeId).toBe('ops');
    expect(ctx.definition.id).toBe('ops');
  });

  it('setActiveMode rejects unknown mode', async () => {
    await expect(setActiveMode('s', 'not_a_mode' as 'developer', 'enterprise')).rejects.toThrow(
      ModeNotFoundError,
    );
  });

  it('setActiveMode rejects plan too low', async () => {
    await expect(setActiveMode('s', 'quantum', 'startup')).rejects.toThrow(ModePlanError);
    expect(mockSetEx).not.toHaveBeenCalled();
  });

  it('setActiveMode writes Redis when allowed', async () => {
    await setActiveMode('s', 'quantum', 'enterprise');
    expect(mockSetEx).toHaveBeenCalledWith(
      'opsly:mode:s',
      expect.any(Number),
      'quantum',
    );
  });

  it('clearMode deletes key', async () => {
    await clearMode('sess-x');
    expect(mockDel).toHaveBeenCalledWith('opsly:mode:sess-x');
  });
});
