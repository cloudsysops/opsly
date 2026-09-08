import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger, getLogger } from '../logger';

describe('createLogger', () => {
  it('returns a logger with info, warn, error, debug methods', () => {
    const logger = createLogger('test-service');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('debug');
  });

  it('info logs to console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = createLogger('svc');
    logger.info('hello', { userId: 'u1' });
    expect(spy).toHaveBeenCalledWith('[svc] INFO:', 'hello', { userId: 'u1' });
    spy.mockRestore();
  });

  it('warn logs to console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = createLogger('svc');
    logger.warn('caution');
    expect(spy).toHaveBeenCalledWith('[svc] WARN:', 'caution', undefined);
    spy.mockRestore();
  });

  it('error logs to console.error with error message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = createLogger('svc');
    const err = new Error('boom');
    logger.error('failed', err, { requestId: 'r1' });
    expect(spy).toHaveBeenCalledWith('[svc] ERROR:', 'failed', 'boom', { requestId: 'r1' });
    spy.mockRestore();
  });

  it('debug only logs when DEBUG env is set', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    delete process.env.DEBUG;
    const logger = createLogger('svc');
    logger.debug('hidden');
    expect(spy).not.toHaveBeenCalled();

    process.env.DEBUG = '1';
    logger.debug('visible');
    expect(spy).toHaveBeenCalledWith('[svc] DEBUG:', 'visible', undefined);

    delete process.env.DEBUG;
    spy.mockRestore();
  });
});

describe('getLogger', () => {
  it('returns existing logger if created', () => {
    const a = createLogger('shared');
    const b = getLogger('shared');
    expect(b).toBe(a);
  });

  it('creates a new logger if not found', () => {
    const logger = getLogger('brand-new');
    expect(logger).toHaveProperty('info');
  });
});
