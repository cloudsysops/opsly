import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthError,
  NotFoundError,
  RateLimitError,
  handleError,
} from '../index';

describe('AppError', () => {
  it('stores code, statusCode, message, and context', () => {
    const err = new AppError('TEST', 418, 'teapot', { key: 'val' });
    expect(err.code).toBe('TEST');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe('teapot');
    expect(err.context).toEqual({ key: 'val' });
    expect(err.name).toBe('AppError');
    expect(err).toBeInstanceOf(Error);
  });

  it('works without context', () => {
    const err = new AppError('X', 500, 'boom');
    expect(err.context).toBeUndefined();
  });
});

describe('ValidationError', () => {
  it('sets code 400', () => {
    const err = new ValidationError('bad input');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('bad input');
  });
});

describe('AuthError', () => {
  it('sets code 401', () => {
    const err = new AuthError('unauthorized');
    expect(err.code).toBe('AUTH_ERROR');
    expect(err.statusCode).toBe(401);
  });
});

describe('NotFoundError', () => {
  it('sets code 404 with resource name in message', () => {
    const err = new NotFoundError('Tenant');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Tenant not found');
  });
});

describe('RateLimitError', () => {
  it('sets code 429 with retryAfter in context', () => {
    const err = new RateLimitError(30);
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.statusCode).toBe(429);
    expect(err.context?.retryAfter).toBe(30);
    expect(err.message).toContain('30');
  });
});

describe('handleError', () => {
  it('extracts AppError fields', () => {
    const err = new ValidationError('nope', { field: 'email' });
    const result = handleError(err);
    expect(result).toEqual({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'nope',
      context: { field: 'email' },
    });
  });

  it('returns 500 for unknown errors', () => {
    const result = handleError(new Error('raw'));
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.statusCode).toBe(500);
  });

  it('returns 500 for non-Error values', () => {
    const result = handleError('string error');
    expect(result.statusCode).toBe(500);
  });
});
