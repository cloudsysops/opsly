import { describe, it, expect, vi } from 'vitest';
import { withRetry, computeDelay, isTransientError, TransientError } from '../retry-policy.js';

describe('computeDelay', () => {
  it('calcula backoff exponencial sin superar el cap', () => {
    expect(computeDelay(1, 500, 30_000, 0)).toBe(500); // 500 * 2^0 = 500
    expect(computeDelay(2, 500, 30_000, 0)).toBe(1_000); // 500 * 2^1 = 1000
    expect(computeDelay(3, 500, 30_000, 0)).toBe(2_000); // 500 * 2^2 = 2000
    expect(computeDelay(10, 500, 30_000, 0)).toBe(30_000); // cap
  });
});

describe('isTransientError', () => {
  it('retorna true para TransientError', () => {
    expect(isTransientError(new TransientError('boom'))).toBe(true);
  });

  it('retorna true para errores con código HTTP 5xx en el mensaje', () => {
    expect(isTransientError(new Error('HTTP 503 unavailable'))).toBe(true);
    expect(isTransientError(new Error('502 bad gateway'))).toBe(true);
  });

  it('retorna true para errores de red', () => {
    expect(isTransientError(new Error('fetch failed ECONNRESET'))).toBe(true);
  });

  it('retorna false para errores no transitorios', () => {
    expect(isTransientError(new Error('unauthorized 401'))).toBe(false);
    expect(isTransientError(new Error('validation error'))).toBe(false);
  });

  it('retorna false para no-Error', () => {
    expect(isTransientError('string error')).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});

describe('withRetry', () => {
  it('retorna el resultado en el primer intento si no hay error', async () => {
    const fn = vi.fn().mockResolvedValue('done');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('done');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('reintenta y tiene éxito en el segundo intento', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('transitorio'))
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 0,
      jitterMs: 0,
    });
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lanza el último error si se agotan los intentos', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('siempre falla'));
    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, jitterMs: 0 })).rejects.toThrow(
      'siempre falla'
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('respeta shouldRetry y no reintenta si retorna false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(
      withRetry(fn, {
        maxAttempts: 5,
        baseDelayMs: 0,
        jitterMs: 0,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('llama onRetry con los parámetros correctos', async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error('temp')).mockResolvedValueOnce('ok');

    await withRetry(fn, { maxAttempts: 3, baseDelayMs: 0, jitterMs: 0, onRetry });
    expect(onRetry).toHaveBeenCalledOnce();
    const [err, attempt] = onRetry.mock.calls[0] as [Error, number, number];
    expect(err.message).toBe('temp');
    expect(attempt).toBe(1);
  });
});
