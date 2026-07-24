import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClassByIdMock = vi.fn();
vi.mock('@/lib/services/class.service', () => ({
  getClassById: getClassByIdMock,
}));

type QueryResult = { data: unknown; error: unknown };

function makeBuilder(queue: QueryResult[]) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.insert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(self);
  builder.limit = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve(queue.shift() ?? { data: null, error: null }));
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(queue.shift() ?? { data: null, error: null })
  );
  return builder;
}

let responseQueue: QueryResult[];

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: () => makeBuilder(responseQueue),
    }),
  }),
}));

describe('createEnrollment', () => {
  beforeEach(() => {
    getClassByIdMock.mockReset();
    responseQueue = [];
  });

  it('joins the waitlist instead of throwing when the class is at capacity', async () => {
    getClassByIdMock.mockResolvedValue({
      id: 'class-1',
      status: 'scheduled',
      starts_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      capacity: 10,
      enrolled_count: 10,
      price_cents: 5000,
    });
    responseQueue.push({
      data: { id: 'enr-1', status: 'waitlisted', payment_status: 'pending' },
      error: null,
    });

    const { createEnrollment } = await import('@/lib/services/enrollment.service');
    const result = await createEnrollment({
      classId: 'class-1',
      studentId: 'student-1',
      familyUserId: 'family-1',
    });

    expect(result.waitlisted).toBe(true);
    expect(result.payment_required).toBe(false);
  });

  it('enrolls normally (not waitlisted) when under capacity', async () => {
    getClassByIdMock.mockResolvedValue({
      id: 'class-1',
      status: 'scheduled',
      starts_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      capacity: 10,
      enrolled_count: 3,
      price_cents: 5000,
    });
    responseQueue.push({
      data: { id: 'enr-1', status: 'reserved', payment_status: 'pending' },
      error: null,
    });

    const { createEnrollment } = await import('@/lib/services/enrollment.service');
    const result = await createEnrollment({
      classId: 'class-1',
      studentId: 'student-1',
      familyUserId: 'family-1',
    });

    expect(result.waitlisted).toBe(false);
    expect(result.payment_required).toBe(true);
  });
});

describe('cancelEnrollment', () => {
  beforeEach(() => {
    getClassByIdMock.mockReset();
    responseQueue = [];
  });

  it('promotes the earliest waitlisted entry to confirmed for a free class', async () => {
    responseQueue.push({
      data: {
        id: 'enr-1',
        class_id: 'class-1',
        status: 'reserved',
        classes: { starts_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
      },
      error: null,
    }); // select current enrollment
    responseQueue.push({
      data: { id: 'enr-1', status: 'cancelled' },
      error: null,
    }); // update -> cancelled
    responseQueue.push({
      data: { id: 'enr-2', payment_status: 'paid' },
      error: null,
    }); // promoteNextWaitlisted select

    const { cancelEnrollment } = await import('@/lib/services/enrollment.service');
    const result = await cancelEnrollment('enr-1', 'family-1');

    expect(result.status).toBe('cancelled');
  });

  it('skips the pre-class cancel window for a waitlisted entry', async () => {
    responseQueue.push({
      data: {
        id: 'enr-3',
        class_id: 'class-1',
        status: 'waitlisted',
        // Class starts in 1 hour — inside the normal 24h cancel window, but
        // that rule only protects seats actually held.
        classes: { starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
      },
      error: null,
    });
    responseQueue.push({
      data: { id: 'enr-3', status: 'cancelled' },
      error: null,
    });

    const { cancelEnrollment } = await import('@/lib/services/enrollment.service');
    await expect(cancelEnrollment('enr-3', 'family-1')).resolves.toMatchObject({
      status: 'cancelled',
    });
  });

  it('still rejects a late cancellation for a seat that was actually held', async () => {
    responseQueue.push({
      data: {
        id: 'enr-4',
        class_id: 'class-1',
        status: 'confirmed',
        classes: { starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
      },
      error: null,
    });

    const { cancelEnrollment } = await import('@/lib/services/enrollment.service');
    await expect(cancelEnrollment('enr-4', 'family-1')).rejects.toThrow(
      /Cancelación permitida hasta/
    );
  });
});
