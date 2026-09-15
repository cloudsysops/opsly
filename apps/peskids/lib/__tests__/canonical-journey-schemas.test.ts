import { describe, expect, it } from 'vitest';
import { peskidsEnrollmentFormSchema } from '@/lib/validation/enrollment-form.schema';
import {
  appendProgressEntry,
  peskidsFamilyFeedbackSchema,
  peskidsTeacherFeedbackSchema,
} from '@/lib/validation/journey-feedback.schema';

describe('canonical enrollment form', () => {
  it('accepts required guardian/student/program/consents without extra child PII', () => {
    const parsed = peskidsEnrollmentFormSchema.parse({
      request_id: 'req-1',
      guardian: {
        first_name: 'Ana',
        last_name: 'Perez',
        email: 'ana@example.com',
        phone: '+573001112233',
      },
      student: { first_name: 'Luis', age_range: 'K-5' },
      program: { modality: 'llanogrande', interest: 'natacion' },
      operational: {},
      consents: { enrollment_confirmed: true, privacy_accepted: true },
    });
    expect('lead_id' in parsed).toBe(false);
    expect('document' in parsed.student).toBe(false);
  });
});

describe('teacher and family feedback', () => {
  it('rejects diagnosis language in teacher feedback', () => {
    expect(() =>
      peskidsTeacherFeedbackSchema.parse({
        student_id: 's1',
        class_id: 'c1',
        participation: 4,
        skill_progress: 4,
        achievement: 'Mejor equilibrio',
        area_to_reinforce: 'diagnostico TDAH',
        confidence: 3,
        recommended_next_step: 'Repetir circuito',
      })
    ).toThrow();
  });

  it('appends progress instead of overwriting', () => {
    const first = [{ occurred_at: '2026-09-01', class_id: 'c1', attendance: 'present' as const }];
    const next = appendProgressEntry(first, {
      occurred_at: '2026-09-08',
      class_id: 'c2',
      attendance: 'present' as const,
    });
    expect(next).toHaveLength(2);
    expect(first).toHaveLength(1);
  });

  it('accepts family feedback with contact request', () => {
    const parsed = peskidsFamilyFeedbackSchema.parse({
      family_id: 'fam-1',
      satisfaction: 5,
      child_enjoyment: 5,
      observed_improvement: true,
      contact_request: true,
      comment: 'Queremos continuar',
    });
    expect(parsed.contact_request).toBe(true);
  });
});
