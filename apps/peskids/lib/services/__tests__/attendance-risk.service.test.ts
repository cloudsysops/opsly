import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertMock, updateEqMock, updateMock, createFollowupMock } = vi.hoisted(() => {
  const updateEqMock = vi.fn();
  return {
    insertMock: vi.fn(),
    updateEqMock,
    updateMock: vi.fn(() => ({ eq: updateEqMock })),
    createFollowupMock: vi.fn(),
  };
});

type QueryResult = { data: unknown; error: null | { message: string } };

function makeQuery(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.limit = vi.fn().mockResolvedValue(result);
  return builder;
}

let studentsQuery: ReturnType<typeof makeQuery>;
let enrollmentsQuery: ReturnType<typeof makeQuery>;

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    from: (table: string) => {
      if (table === 'students') return studentsQuery;
      return makeQuery({ data: [], error: null });
    },
    schema: (name: string) => ({
      from: (table: string) => {
        if (name === 'peskids' && table === 'class_enrollments') return enrollmentsQuery;
        if (name === 'platform' && table === 'peskids_aging_alert_deliveries') {
          return { insert: insertMock, update: updateMock };
        }
        return makeQuery({ data: [], error: null });
      },
    }),
  }),
}));

vi.mock('@/lib/services/followup-admin.service', () => ({
  createFollowup: createFollowupMock,
}));

import { processAttendanceRisk } from '@/lib/services/attendance-risk.service';

const STUDENT_ID = '22222222-2222-2222-2222-222222222222';

describe('processAttendanceRisk', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    updateEqMock.mockReset().mockResolvedValue({ error: null });
    createFollowupMock.mockReset().mockResolvedValue({ id: 'fu-1' });
    studentsQuery = makeQuery({ data: [{ id: STUDENT_ID }], error: null });
    enrollmentsQuery = makeQuery({ data: [], error: null });
    delete process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED;
    delete process.env.PESKIDS_ATTENDANCE_RISK_THRESHOLD;
  });

  it('no-ops when the flag is off', async () => {
    const result = await processAttendanceRisk(new Date('2026-07-24T12:00:00.000Z'), '2026-07-24');
    expect(result).toEqual({
      scanned_students: 0,
      at_risk: 0,
      auto_followups_created: 0,
      skipped: 0,
      failed: 0,
    });
    expect(createFollowupMock).not.toHaveBeenCalled();
  });

  it('creates a followup once a student crosses the consecutive-absence threshold', async () => {
    process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED = 'true';
    enrollmentsQuery = makeQuery({
      data: [
        {
          student_id: STUDENT_ID,
          status: 'no_show',
          attendance: null,
          classes: { starts_at: '2026-07-01T09:00:00.000Z' },
        },
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-08T09:00:00.000Z' },
        },
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-15T09:00:00.000Z' },
        },
      ],
      error: null,
    });

    const result = await processAttendanceRisk(new Date('2026-07-24T12:00:00.000Z'), '2026-07-24');

    expect(result.scanned_students).toBe(1);
    expect(result.at_risk).toBe(1);
    expect(result.auto_followups_created).toBe(1);
    expect(createFollowupMock).toHaveBeenCalledWith(
      expect.objectContaining({ contact_id: STUDENT_ID, contact_type: 'student', type: 'call' })
    );
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ alert_kind: 'attendance_risk', entity_type: 'student', entity_id: STUDENT_ID })
    );
  });

  it('does not alert below the threshold', async () => {
    process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED = 'true';
    enrollmentsQuery = makeQuery({
      data: [
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-15T09:00:00.000Z' },
        },
      ],
      error: null,
    });

    const result = await processAttendanceRisk(new Date('2026-07-24T12:00:00.000Z'), '2026-07-24');
    expect(result.at_risk).toBe(0);
    expect(createFollowupMock).not.toHaveBeenCalled();
  });

  it('skips (does not double-create) when idempotency claim is a duplicate', async () => {
    process.env.PESKIDS_ATTENDANCE_RISK_ALERT_ENABLED = 'true';
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    enrollmentsQuery = makeQuery({
      data: [
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-01T09:00:00.000Z' },
        },
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-08T09:00:00.000Z' },
        },
        {
          student_id: STUDENT_ID,
          status: 'attended',
          attendance: 'absent',
          classes: { starts_at: '2026-07-15T09:00:00.000Z' },
        },
      ],
      error: null,
    });

    const result = await processAttendanceRisk(new Date('2026-07-24T12:00:00.000Z'), '2026-07-24');
    expect(result.skipped).toBe(1);
    expect(result.at_risk).toBe(0);
    expect(createFollowupMock).not.toHaveBeenCalled();
  });
});
