import { beforeEach, describe, expect, it, vi } from 'vitest';

const getServiceClientMock = vi.fn();
const getCacheMock = vi.fn();
const setCacheMock = vi.fn(() => Promise.resolve(true));

vi.mock('../supabase', () => ({
  getServiceClient: getServiceClientMock,
}));

vi.mock('../redis-cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
}));

describe('computeTechnicianSlots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCacheMock.mockReturnValue(Promise.resolve(true));
  });

  it('returns cached slots on Redis cache hit', async () => {
    const cachedSlots = [
      { time: '09:00', available: true },
      { time: '09:30', available: false },
    ];
    getCacheMock.mockResolvedValueOnce(cachedSlots);

    const { computeTechnicianSlots } = await import('../technician-available-slots');
    const result = await computeTechnicianSlots({
      tenantSlug: 'acme-repair',
      dateOnly: '2026-06-15',
      dayOfWeek: 1,
      slotStepMinutes: 30,
      serviceDurationMinutes: 30,
    });

    expect(result).toEqual(cachedSlots);
    expect(getCacheMock).toHaveBeenCalledWith(
      'local_services:available_slots:acme-repair:2026-06-15:30:30'
    );
    expect(getServiceClientMock).not.toHaveBeenCalled();
  });

  it('queries database, builds slots, and sets cache on cache miss', async () => {
    getCacheMock.mockResolvedValueOnce(null);

    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: { start_time: '09:00:00', end_time: '11:00:00', is_available: true },
      error: null,
    });

    const inMock = vi.fn().mockResolvedValue({
      data: [{ scheduled_at: '2026-06-15T09:30:00.000Z' }],
      error: null,
    });

    getServiceClientMock.mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === 'ls_technician_schedules') {
            const chain = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: maybeSingleMock,
            };
            return chain;
          }
          if (table === 'ls_bookings') {
            const chain = {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockReturnThis(),
              in: inMock,
            };
            return chain;
          }
          throw new Error(`Unexpected table ${table}`);
        }),
      }),
    });

    const { computeTechnicianSlots } = await import('../technician-available-slots');
    const result = await computeTechnicianSlots({
      tenantSlug: 'acme-repair',
      dateOnly: '2026-06-15',
      dayOfWeek: 1,
      slotStepMinutes: 30,
      serviceDurationMinutes: 30,
    });

    expect(result).toEqual([
      { time: '09:00', available: true },
      { time: '09:30', available: false },
      { time: '10:00', available: true },
      { time: '10:30', available: true },
    ]);
    expect(setCacheMock).toHaveBeenCalledWith(
      'local_services:available_slots:acme-repair:2026-06-15:30:30',
      result,
      60
    );
  });

  it('returns empty array when no technician schedule found', async () => {
    getCacheMock.mockResolvedValueOnce(null);

    getServiceClientMock.mockReturnValue({
      schema: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    const { computeTechnicianSlots } = await import('../technician-available-slots');
    const result = await computeTechnicianSlots({
      tenantSlug: 'acme-repair',
      dateOnly: '2026-06-15',
      dayOfWeek: 1,
      slotStepMinutes: 30,
      serviceDurationMinutes: 30,
    });

    expect(result).toEqual([]);
    expect(setCacheMock).not.toHaveBeenCalled();
  });
});
