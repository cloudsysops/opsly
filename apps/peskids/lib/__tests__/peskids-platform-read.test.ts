import { describe, expect, it } from 'vitest';
import {
  isMissingPlatformPeskidsTable,
  mapPlatformFeedbackRow,
  mapPlatformLeadRow,
  mapPlatformLeadStatus,
  mergeBiLeadCountFallback,
  mergeBiStudentFallback,
} from '@/lib/peskids-platform-read';

describe('peskids-platform-read', () => {
  it('detects missing platform peskids tables', () => {
    expect(isMissingPlatformPeskidsTable({ message: 'relation "platform.peskids_leads" does not exist' })).toBe(
      true
    );
    expect(isMissingPlatformPeskidsTable({ message: 'permission denied for schema platform' })).toBe(
      true
    );
    expect(isMissingPlatformPeskidsTable({ message: 'network timeout' })).toBe(false);
  });

  it('maps platform lead statuses to dashboard statuses', () => {
    expect(mapPlatformLeadStatus('new')).toBe('new');
    expect(mapPlatformLeadStatus('contacted')).toBe('contacted');
    expect(mapPlatformLeadStatus('qualified')).toBe('trial');
    expect(mapPlatformLeadStatus('converted')).toBe('enrolled');
    expect(mapPlatformLeadStatus('lost')).toBe('archived');
  });

  it('maps platform lead rows to dashboard lead shape', () => {
    const mapped = mapPlatformLeadRow({
      id: 'lead-1',
      full_name: 'Ana Pérez',
      email: 'ana@example.com',
      phone: '+573001112233',
      class_modality: 'presencial',
      neighborhood: 'Chapinero',
      grade_interested: '3A',
      status: 'converted',
      admin_notes: 'Lista para matrícula',
    });

    expect(mapped).toMatchObject({
      id: 'lead-1',
      name: 'Ana Pérez',
      email: 'ana@example.com',
      status: 'enrolled',
      referral_discount_cents: 0,
      referral_redemptions: 0,
    });
  });

  it('maps platform feedback rows to dashboard feedback shape', () => {
    const mapped = mapPlatformFeedbackRow({
      id: 'fb-1',
      child_name: 'Mia',
      satisfaction: 5,
      suggestion: 'Excelente',
      status: 'new',
      created_at: '2026-05-26T12:00:00Z',
    });

    expect(mapped).toMatchObject({
      id: 'fb-1',
      child_name: 'Mia',
      satisfaction: 5,
      visibility: 'public',
      audience: 'family',
      rating: 5,
    });
  });

  it('uses BI snapshot student counts when live students are empty', () => {
    const merged = mergeBiStudentFallback(0, {}, { active: 12, by_grade: { '3A': 7, '4B': 5 } });
    expect(merged.activeStudentsCount).toBe(12);
    expect(merged.studentsByGrade).toEqual({ '3A': 7, '4B': 5 });
  });

  it('prefers live student counts over BI snapshot', () => {
    const merged = mergeBiStudentFallback(3, { '3A': 3 }, { active: 12, by_grade: { '4B': 12 } });
    expect(merged.activeStudentsCount).toBe(3);
    expect(merged.studentsByGrade).toEqual({ '3A': 3 });
  });

  it('uses BI snapshot lead total when live leads are empty', () => {
    expect(mergeBiLeadCountFallback(0, 18)).toBe(18);
    expect(mergeBiLeadCountFallback(2, 18)).toBe(2);
  });
});
