import { beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('redis', () => ({
  createClient: createClientMock,
}));

import { checkRateLimit, resetRateLimiterStateForTests } from '../../lib/rate-limiter';

type MockRedisClient = {
  isOpen: boolean;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  sendCommand: ReturnType<typeof vi.fn>;
};

function buildRedisClient(count: number, ttlSeconds: number): MockRedisClient {
  const client: MockRedisClient = {
    isOpen: false,
    on: vi.fn(),
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    sendCommand: vi.fn().mockResolvedValue([count, ttlSeconds]),
  };

  return client;
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimiterStateForTests();
    createClientMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('permite la primera solicitud y crea el TTL de la ventana', async () => {
    const nowMs = 1_700_000_000_000;
    const redis = buildRedisClient(1, 60);

    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
    createClientMock.mockReturnValue(redis);
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const result = await checkRateLimit('tenant-a');

    expect(createClientMock).toHaveBeenCalledWith({
      url: 'redis://127.0.0.1:6379',
    });
    expect(redis.connect).toHaveBeenCalledTimes(1);
    expect(redis.sendCommand).toHaveBeenCalledWith([
      'EVAL',
      expect.stringContaining("redis.call('INCR'"),
      '1',
      'ratelimit:tenant-a',
      '60',
    ]);
    expect(result).toEqual({
      allowed: true,
      remaining: 99,
      resetAt: new Date(nowMs + 60_000),
    });
  });

  it('bloquea cuando supera el límite y usa el TTL existente', async () => {
    const nowMs = 1_700_000_500_000;
    const redis = buildRedisClient(101, 12);

    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
    createClientMock.mockReturnValue(redis);
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const result = await checkRateLimit('tenant-a');

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: new Date(nowMs + 12_000),
    });
  });

  it('usa fallback en memoria si REDIS_URL no está configurada', async () => {
    const nowMs = 1_700_000_100_000;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubEnv('REDIS_URL', '');
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const first = await checkRateLimit('tenant-a');
    const second = await checkRateLimit('tenant-a');

    expect(createClientMock).not.toHaveBeenCalled();
    expect(first).toEqual({
      allowed: true,
      remaining: 99,
      resetAt: new Date(nowMs + 60_000),
    });
    expect(second).toEqual({
      allowed: true,
      remaining: 98,
      resetAt: new Date(nowMs + 60_000),
    });
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith('[rate-limiter] REDIS_URL not set');
  });

  it('usa fallback en memoria si Redis falla durante la petición', async () => {
    const nowMs = 1_700_000_200_000;
    const redis = buildRedisClient(1, 60);
    const boom = new Error('boom');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    redis.sendCommand.mockRejectedValue(boom);
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
    createClientMock.mockReturnValue(redis);
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    const result = await checkRateLimit('tenant-a');

    expect(result).toEqual({
      allowed: true,
      remaining: 99,
      resetAt: new Date(nowMs + 60_000),
    });
    expect(error).toHaveBeenCalledWith('[rate-limiter] request failed', boom);
  });

  it('bloquea en fallback memoria cuando supera el límite', async () => {
    const nowMs = 1_700_000_300_000;
    vi.stubEnv('REDIS_URL', '');
    vi.spyOn(Date, 'now').mockReturnValue(nowMs);

    let result = await checkRateLimit('tenant-a');
    for (let i = 1; i < 101; i += 1) {
      result = await checkRateLimit('tenant-a');
    }

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: new Date(nowMs + 60_000),
    });
  });

  it('falla explícitamente si el tenantSlug está vacío', async () => {
    await expect(checkRateLimit('   ')).rejects.toThrow('tenantSlug is required');
  });
});
