import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as redisMetering from '../billing/redis-metering';
import {
  getBillingMonthBoundsUtc,
  resetBillingRedisWarningThrottleForTests,
  roundUsd2,
  sumPendingRedisUsageUsd,
} from '../portal-billing-summary';

vi.mock('../billing/redis-metering', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../billing/redis-metering')>();
  return {
    ...actual,
    getMeteringRedis: vi.fn(),
  };
});

describe('getBillingMonthBoundsUtc', () => {
  it('devuelve abril 2026 y 9 días transcurridos el día 9 UTC', () => {
    const d = new Date(Date.UTC(2026, 3, 9, 12, 0, 0));
    const b = getBillingMonthBoundsUtc(d);
    expect(b.periodStart).toBe('2026-04-01');
    expect(b.periodEnd).toBe('2026-04-30');
    expect(b.daysInMonth).toBe(30);
    expect(b.daysElapsedForRate).toBe(9);
    expect(b.recordedAtGteIso.startsWith('2026-04-01T')).toBe(true);
  });

  it('día 1 del mes: daysElapsedForRate es 1', () => {
    const d = new Date(Date.UTC(2026, 4, 1, 8, 0, 0));
    const b = getBillingMonthBoundsUtc(d);
    expect(b.daysElapsedForRate).toBe(1);
  });
});

describe('roundUsd2', () => {
  it('redondea a 2 decimales', () => {
    expect(roundUsd2(15.555)).toBe(15.56);
    expect(roundUsd2(12)).toBe(12);
  });
});

describe('sumPendingRedisUsageUsd', () => {
  const tenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  beforeEach(() => {
    resetBillingRedisWarningThrottleForTests();
    vi.unstubAllEnvs();
    vi.mocked(redisMetering.getMeteringRedis).mockReset();
  });

  it('devuelve 0 y registra advertencia en stderr si Redis no está disponible', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
    vi.mocked(redisMetering.getMeteringRedis).mockResolvedValue(null);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const n = await sumPendingRedisUsageUsd(tenantId);
    expect(n).toBe(0);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        '[BILLING WARNING] Redis unreachable. Real-time billing disabled. Data may be delayed.'
      )
    );
    log.mockRestore();
  });

  it('devuelve 0 y advierte si REDIS_URL no está definida', async () => {
    vi.stubEnv('REDIS_URL', '');
    vi.mocked(redisMetering.getMeteringRedis).mockResolvedValue(null);
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});

    const n = await sumPendingRedisUsageUsd(tenantId);
    expect(n).toBe(0);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('REDIS_URL not set'));
    log.mockRestore();
  });

  it('calcula la suma correcta usando MGET cuando hay datos en Redis', async () => {
    vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
    const mockMGet = vi.fn().mockResolvedValue(['100', '5000', '0.5', '200']);
    vi.mocked(redisMetering.getMeteringRedis).mockResolvedValue({
      mGet: mockMGet,
    } as any);

    const n = await sumPendingRedisUsageUsd(tenantId);

    // cpu_seconds: 100 * 0.00001 = 0.001
    // ai_tokens: 5000 * 0.0001 = 0.5
    // storage_gb: 0.5 * 0.001 = 0.0005
    // worker_seconds: 200 * 0.00001 = 0.002
    // Total: 0.001 + 0.5 + 0.0005 + 0.002 = 0.5035
    expect(n).toBe(0.5035);
    expect(mockMGet).toHaveBeenCalledWith([
      `usage:${tenantId}:cpu_seconds`,
      `usage:${tenantId}:ai_tokens`,
      `usage:${tenantId}:storage_gb`,
      `usage:${tenantId}:worker_seconds`,
    ]);
  });
});
