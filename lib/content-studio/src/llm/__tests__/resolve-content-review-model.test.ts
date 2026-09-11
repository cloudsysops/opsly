import { describe, expect, it } from 'vitest';
import { resolveContentReviewRoutingModel } from '../client.js';

describe('resolveContentReviewRoutingModel', () => {
  it('defaults to cheap when env is empty', () => {
    expect(resolveContentReviewRoutingModel(undefined)).toBe('cheap');
    expect(resolveContentReviewRoutingModel('')).toBe('cheap');
    expect(resolveContentReviewRoutingModel('   ')).toBe('cheap');
  });

  it('passes known gateway aliases', () => {
    expect(resolveContentReviewRoutingModel('cheap')).toBe('cheap');
    expect(resolveContentReviewRoutingModel('llama')).toBe('cheap');
    expect(resolveContentReviewRoutingModel('haiku')).toBe('haiku');
    expect(resolveContentReviewRoutingModel('sonnet')).toBe('sonnet');
    expect(resolveContentReviewRoutingModel('SONNET')).toBe('sonnet');
  });

  it('maps Ollama tags to cheap (local-first)', () => {
    expect(resolveContentReviewRoutingModel('qwen3:14b')).toBe('cheap');
    expect(resolveContentReviewRoutingModel('gemma3:12b')).toBe('cheap');
    expect(resolveContentReviewRoutingModel('nemotron-3-nano')).toBe('cheap');
  });
});
