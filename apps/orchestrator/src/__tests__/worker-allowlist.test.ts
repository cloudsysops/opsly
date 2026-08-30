import { describe, expect, it } from 'vitest';
import { isWorkerAllowed, parseWorkerAllowlist } from '../worker-allowlist.js';

describe('parseWorkerAllowlist', () => {
  it('returns null when unset or blank', () => {
    expect(parseWorkerAllowlist(undefined)).toBeNull();
    expect(parseWorkerAllowlist('')).toBeNull();
    expect(parseWorkerAllowlist('   ')).toBeNull();
  });

  it('parses CSV case-insensitively', () => {
    const set = parseWorkerAllowlist('ollama, Notify ,RESEARCH');
    expect(set).not.toBeNull();
    expect(set?.has('ollama')).toBe(true);
    expect(set?.has('notify')).toBe(true);
    expect(set?.has('research')).toBe(true);
    expect(set?.size).toBe(3);
  });
});

describe('isWorkerAllowed', () => {
  it('allows all when allowlist is null', () => {
    expect(isWorkerAllowed('ollama', null)).toBe(true);
    expect(isWorkerAllowed('cursor', null)).toBe(true);
  });

  it('filters by key', () => {
    const set = parseWorkerAllowlist('ollama');
    expect(isWorkerAllowed('ollama', set)).toBe(true);
    expect(isWorkerAllowed('notify', set)).toBe(false);
  });
});
