import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchHostMetricsFromPrometheus } from '../fetch-host-metrics-prometheus';
import * as prometheus from '../prometheus';
import * as redisCache from '../redis-cache';

vi.mock('../prometheus', () => ({
  promInstantQuery: vi.fn(),
  aggregateInstantVector: vi.fn(),
  getPrometheusBaseUrl: vi.fn(() => 'http://localhost:9090'),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(async () => true),
}));

describe('fetchHostMetricsFromPrometheus', () => {
  const mockBase = 'http://localhost:9090';
  const mockMetrics = {
    cpu_percent: 10,
    ram_used_gb: 4,
    ram_total_gb: 16,
    disk_used_gb: 50,
    disk_total_gb: 100,
    uptime_seconds: 3600,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached metrics if available', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(mockMetrics);

    const result = await fetchHostMetricsFromPrometheus(mockBase);

    expect(result).toEqual(mockMetrics);
    expect(redisCache.getCache).toHaveBeenCalledWith(`metrics:host_prom:${mockBase}`);
    expect(prometheus.promInstantQuery).not.toHaveBeenCalled();
  });

  it('fetches from Prometheus on cache miss and sets cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);

    // Mock successful Prometheus responses
    vi.mocked(prometheus.promInstantQuery).mockResolvedValue({ status: 'success', data: { resultType: 'vector', result: [{ metric: {}, value: [0, '10'] }] } } as any);
    vi.mocked(prometheus.aggregateInstantVector).mockReturnValue(10);

    const result = await fetchHostMetricsFromPrometheus(mockBase);

    expect(result).toBeDefined();
    expect(prometheus.promInstantQuery).toHaveBeenCalledTimes(6);
    expect(redisCache.setCache).toHaveBeenCalledWith(`metrics:host_prom:${mockBase}`, expect.anything(), expect.anything());
  });

  it('returns null if Prometheus fetch fails and no cache', async () => {
    vi.mocked(redisCache.getCache).mockResolvedValue(null);
    vi.mocked(prometheus.promInstantQuery).mockResolvedValue(null);

    const result = await fetchHostMetricsFromPrometheus(mockBase);

    expect(result).toBeNull();
  });
});
