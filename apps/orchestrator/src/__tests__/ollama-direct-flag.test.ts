import { describe, expect, it } from 'vitest';
import { shouldUseDirectOllama } from '../workers/OllamaWorker.js';

describe('shouldUseDirectOllama', () => {
  it('is false by default', () => {
    expect(shouldUseDirectOllama({})).toBe(false);
  });

  it('is true when OPSLY_OLLAMA_DIRECT=true', () => {
    expect(shouldUseDirectOllama({ OPSLY_OLLAMA_DIRECT: 'true' })).toBe(true);
  });

  it('is true for ephemeral worker with OLLAMA_URL', () => {
    expect(
      shouldUseDirectOllama({
        OPSLY_EPHEMERAL_WORKER: 'true',
        OLLAMA_URL: 'http://127.0.0.1:11434',
      })
    ).toBe(true);
  });

  it('is false for ephemeral without OLLAMA_URL', () => {
    expect(shouldUseDirectOllama({ OPSLY_EPHEMERAL_WORKER: 'true' })).toBe(false);
  });
});
