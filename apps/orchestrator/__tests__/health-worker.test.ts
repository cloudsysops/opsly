import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock redis before importing HealthWorker
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  })),
}));

vi.mock('../src/workers/NotifyWorker.js', () => ({
  notifyDiscord: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { createClient } from 'redis';
import { notifyDiscord } from '../src/workers/NotifyWorker.js';
import { startHealthWorker } from '../src/workers/HealthWorker.js';

describe('HealthWorker', () => {
  let timer: NodeJS.Timeout | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
    process.env.PLATFORM_DOMAIN = 'ops.example.com';
  });

  afterEach(() => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.PLATFORM_DOMAIN;
  });

  it('creates a Redis client with the given connection params', () => {
    timer = startHealthWorker({ host: 'localhost', port: 6379, password: 'secret' });
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        socket: { host: 'localhost', port: 6379 },
        password: 'secret',
      })
    );
  });

  it('returns a timer that can be cleared', () => {
    timer = startHealthWorker({ host: 'localhost', port: 6379 });
    expect(timer).toBeDefined();
    expect(() => clearInterval(timer)).not.toThrow();
  });

  it('fetches active slugs from Supabase on tick', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('supabase')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ slug: 'acme' }]),
        });
      }
      // Health pings — healthy
      return Promise.resolve({ ok: true, status: 200 });
    });

    timer = startHealthWorker({ host: 'localhost', port: 6379 });
    await new Promise((r) => setTimeout(r, 50));

    const supabaseCalls = mockFetch.mock.calls.filter((c: unknown[]) =>
      String(c[0]).includes('supabase')
    );
    expect(supabaseCalls.length).toBeGreaterThan(0);
  });

  it('does not notify when all services are healthy', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    timer = startHealthWorker({ host: 'localhost', port: 6379 });
    await new Promise((r) => setTimeout(r, 50));
    expect(notifyDiscord).not.toHaveBeenCalled();
  });

  it('notifies Discord after MAX_CONSECUTIVE_FAILURES failures', async () => {
    // Redis: incr returns 3 (failure threshold hit)
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      incr: vi.fn().mockResolvedValue(3),
      expire: vi.fn().mockResolvedValue(1),
    });

    // Supabase returns one tenant; all health pings fail
    mockFetch.mockImplementation((url: string) => {
      if (String(url).includes('supabase')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ slug: 'acme' }]),
        });
      }
      return Promise.reject(new Error('connection refused'));
    });

    timer = startHealthWorker({ host: 'localhost', port: 6379 });
    // Allow multiple interval ticks
    await new Promise((r) => setTimeout(r, 150));

    expect(notifyDiscord).toHaveBeenCalled();
  });
});
