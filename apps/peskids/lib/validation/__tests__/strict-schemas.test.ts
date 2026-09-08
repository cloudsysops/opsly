/**
 * Mutation payloads must reject rather than silently strip.
 *
 * Zod strips unknown keys by default, which already prevents mass assignment,
 * but silently. `.strict()` turns "the client sent a field we do not model" into
 * a 400 so contract drift and probing are both visible.
 */
import { describe, expect, it } from 'vitest';
import { createBadgeSchema } from '../badge.schema';
import {
  attendanceUpdateSchema,
  checkoutSchema,
  createClassSchema,
  createEnrollmentSchema,
  updateClassSchema,
} from '../class.schema';
import { createFollowupSchema, patchFollowupSchema } from '../followup.schema';
import { leadConvertSchema } from '../lead-convert.schema';
import { leadQuickActionSchema } from '../lead-quick-action.schema';
import { createStudentSchema, updateStudentSchema } from '../student.schema';
import { createSubmissionSchema, gradeSubmissionSchema } from '../submission.schema';
import {
  calculateRoyaltySchema,
  createAgreementSchema,
  createSalesReportSchema,
} from '../franchise.schema';

const UUID = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';

describe('unknown fields are rejected, not stripped', () => {
  const cases: Array<[string, { safeParse: (v: unknown) => { success: boolean } }, object]> = [
    ['createStudentSchema', createStudentSchema, { name: 'Ana Ruiz', grade: 'K-5' }],
    ['updateStudentSchema', updateStudentSchema, { status: 'inactive' }],
    ['createBadgeSchema', createBadgeSchema, { label: 'Delfín' }],
    [
      'createFollowupSchema',
      createFollowupSchema,
      { contact_id: UUID, contact_type: 'lead', type: 'call', due_date: '2026-09-10' },
    ],
    ['patchFollowupSchema', patchFollowupSchema, { status: 'completed' }],
    ['createSubmissionSchema', createSubmissionSchema, { formId: 'f1', data: { a: 1 } }],
    ['gradeSubmissionSchema', gradeSubmissionSchema, { score: 90 }],
    ['leadQuickActionSchema', leadQuickActionSchema, { action: 'hold' }],
    ['leadConvertSchema', leadConvertSchema, { child_name: 'Ana Ruiz' }],
    ['updateClassSchema', updateClassSchema, { title: 'Nivel 2' }],
    ['createEnrollmentSchema', createEnrollmentSchema, { class_id: UUID, student_id: UUID_2 }],
    ['checkoutSchema', checkoutSchema, { enrollment_id: UUID }],
  ];

  for (const [name, schema, valid] of cases) {
    it(`${name} accepts a modelled payload`, () => {
      expect(schema.safeParse(valid).success).toBe(true);
    });

    it(`${name} rejects an injected privileged field`, () => {
      // `tenant_id` / `role` are the classic mass-assignment targets.
      expect(schema.safeParse({ ...valid, tenant_id: 'other-tenant' }).success).toBe(false);
      expect(schema.safeParse({ ...valid, role: 'owner' }).success).toBe(false);
    });
  }
});

describe('scalar hardening', () => {
  it('rejects a malformed UUID', () => {
    expect(createEnrollmentSchema.safeParse({ class_id: 'abc', student_id: UUID_2 }).success).toBe(
      false
    );
  });

  it('rejects an oversized string', () => {
    expect(
      createStudentSchema.safeParse({ name: 'x'.repeat(500), grade: 'K-5' }).success
    ).toBe(false);
  });

  it('rejects a malformed enum', () => {
    expect(leadQuickActionSchema.safeParse({ action: 'delete_everything' }).success).toBe(false);
  });

  it('rejects an unexpected nested object', () => {
    expect(
      updateStudentSchema.safeParse({ notes: { $ne: null } as unknown as string }).success
    ).toBe(false);
  });

  it('caps the attendance batch size', () => {
    const updates = Array.from({ length: 201 }, () => ({
      enrollment_id: UUID,
      attendance: 'present' as const,
    }));
    expect(attendanceUpdateSchema.safeParse({ updates }).success).toBe(false);
    expect(attendanceUpdateSchema.safeParse({ updates: updates.slice(0, 5) }).success).toBe(true);
  });

  it('rejects a nested unknown field inside the attendance batch', () => {
    expect(
      attendanceUpdateSchema.safeParse({
        updates: [{ enrollment_id: UUID, attendance: 'present', status: 'confirmed' }],
      }).success
    ).toBe(false);
  });

  it('rejects a class whose end precedes its start', () => {
    const base = {
      title: 'Nivel 1',
      level: 1,
      professor_user_id: UUID,
      pool_id: UUID_2,
      location: 'llanogrande',
      capacity: 8,
      price_cents: 0,
      starts_at: '2026-09-10T10:00:00.000Z',
      ends_at: '2026-09-10T09:00:00.000Z',
    };
    expect(createClassSchema.safeParse(base).success).toBe(false);
    expect(
      createClassSchema.safeParse({ ...base, ends_at: '2026-09-10T11:00:00.000Z' }).success
    ).toBe(true);
  });
});

describe('monetary formats (franchise)', () => {
  const base = {
    unitId: UUID,
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    grossSalesMinor: 1_000_000,
  };

  it('accepts integer minor units', () => {
    expect(createSalesReportSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a negative amount', () => {
    expect(createSalesReportSchema.safeParse({ ...base, grossSalesMinor: -1 }).success).toBe(false);
  });

  it('rejects a fractional amount (minor units must be integers)', () => {
    expect(createSalesReportSchema.safeParse({ ...base, grossSalesMinor: 10.5 }).success).toBe(
      false
    );
  });

  it('rejects NaN and Infinity', () => {
    expect(createSalesReportSchema.safeParse({ ...base, grossSalesMinor: NaN }).success).toBe(false);
    expect(
      createSalesReportSchema.safeParse({ ...base, grossSalesMinor: Number.POSITIVE_INFINITY })
        .success
    ).toBe(false);
  });

  it('rejects a money value sent as a string', () => {
    expect(createSalesReportSchema.safeParse({ ...base, grossSalesMinor: '1000' }).success).toBe(
      false
    );
  });

  it('rejects an absurd amount', () => {
    expect(
      createSalesReportSchema.safeParse({ ...base, grossSalesMinor: 9_999_999_999_999 }).success
    ).toBe(false);
  });

  it('rejects exclusions greater than gross sales', () => {
    expect(
      createSalesReportSchema.safeParse({ ...base, excludedSalesMinor: 2_000_000 }).success
    ).toBe(false);
  });

  it('rejects an inverted period', () => {
    expect(
      createSalesReportSchema.safeParse({
        ...base,
        periodStart: '2026-08-31',
        periodEnd: '2026-08-01',
      }).success
    ).toBe(false);
  });

  it('rejects an unknown field on a money payload', () => {
    expect(createSalesReportSchema.safeParse({ ...base, tenantId: 'other' }).success).toBe(false);
  });

  it('requires a report id and a rule for a royalty calculation', () => {
    expect(calculateRoyaltySchema.safeParse({}).success).toBe(false);
    expect(calculateRoyaltySchema.safeParse({ reportId: UUID }).success).toBe(false);
    expect(calculateRoyaltySchema.safeParse({ reportId: UUID, ruleId: UUID_2 }).success).toBe(true);
  });

  it('bounds basis points to 0..10000', () => {
    expect(
      calculateRoyaltySchema.safeParse({ reportId: UUID, rule: { percentageBps: 10_001 } }).success
    ).toBe(false);
    expect(
      calculateRoyaltySchema.safeParse({ reportId: UUID, rule: { percentageBps: 500 } }).success
    ).toBe(true);
  });

  it('rejects an agreement that expires before it starts', () => {
    expect(
      createAgreementSchema.safeParse({
        legalName: 'Peskids Llanogrande SAS',
        unitIds: [UUID],
        effectiveDate: '2026-09-01',
        expirationDate: '2026-08-01',
      }).success
    ).toBe(false);
  });
});
