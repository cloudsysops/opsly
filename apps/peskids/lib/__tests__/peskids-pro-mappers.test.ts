import { describe, expect, it } from 'vitest';
import {
  PESKIDS_CANONICAL_EVENT_NAMES,
  PESKIDS_DEPRECATED_TRIAL_EVENT_NAMES,
  PESKIDS_PRO_EVENT_NAMES,
} from '@/lib/events';
import type { LeadStatus } from '@/lib/domain/peskids-pro-contracts';
import {
  adminLeadStatusToPro,
  adminLeadStatusToTwentyStageSlug,
  followUpStatusLiveToPro,
  followUpTypeLiveToPro,
  normalizeLeadSource,
  platformLeadStatusToPro,
  proLeadStatusToAdmin,
  proLeadStatusToPlatform,
  proLeadStatusToTwentyStageSlug,
  trialStatusLiveToPro,
  trialStatusProToLive,
} from '@/lib/domain/peskids-pro-mappers';

const ALL_PRO_LEAD_STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'enrollment_in_progress',
  'enrolled',
  'lost',
];

describe('peskids-pro mappers (canonical journey)', () => {
  it('round-trips admin ↔ pro for coarse stages', () => {
    expect(adminLeadStatusToPro('new')).toBe('new');
    expect(adminLeadStatusToPro('contacted')).toBe('contacted');
    expect(adminLeadStatusToPro('trial')).toBe('enrollment_in_progress');
    expect(adminLeadStatusToPro('enrolled')).toBe('enrolled');
    expect(adminLeadStatusToPro('archived')).toBe('lost');

    expect(proLeadStatusToAdmin('enrollment_in_progress')).toBe('trial');
    expect(proLeadStatusToAdmin('lost')).toBe('archived');
  });

  it('round-trips platform ↔ pro for coarse stages', () => {
    expect(platformLeadStatusToPro('qualified')).toBe('enrollment_in_progress');
    expect(platformLeadStatusToPro('converted')).toBe('enrolled');
    expect(platformLeadStatusToPro('lost')).toBe('lost');

    expect(proLeadStatusToPlatform('enrollment_in_progress')).toBe('qualified');
    expect(proLeadStatusToPlatform('enrolled')).toBe('converted');
  });

  it('maps every Pro lead status to a Twenty stage slug', () => {
    const expected: Record<LeadStatus, string> = {
      new: 'NEW',
      contacted: 'CONTACTED',
      enrollment_in_progress: 'ENROLLMENT',
      enrolled: 'ENROLLED',
      lost: 'LOST',
    };
    for (const status of ALL_PRO_LEAD_STATUSES) {
      expect(proLeadStatusToTwentyStageSlug(status)).toBe(expected[status]);
    }
  });

  it('maps admin statuses to Twenty stage slugs via Pro', () => {
    expect(adminLeadStatusToTwentyStageSlug('contacted')).toBe('CONTACTED');
    expect(adminLeadStatusToTwentyStageSlug('trial')).toBe('ENROLLMENT');
    expect(adminLeadStatusToTwentyStageSlug('enrolled')).toBe('ENROLLED');
    expect(adminLeadStatusToTwentyStageSlug('archived')).toBe('LOST');
  });

  it('keeps leftover trial row adapters without treating them as a business stage', () => {
    expect(trialStatusLiveToPro('attended')).toBe('completed');
    expect(trialStatusProToLive('completed')).toBe('attended');
    expect(trialStatusLiveToPro('scheduled')).toBe('scheduled');
  });

  it('derives follow-up overdue only when pending + overdue flag', () => {
    expect(followUpStatusLiveToPro('pending')).toBe('pending');
    expect(followUpStatusLiveToPro('pending', { overdue: true })).toBe('overdue');
    expect(followUpStatusLiveToPro('completed', { overdue: true })).toBe('completed');
  });

  it('maps live follow-up types toward Pro vocabulary', () => {
    expect(followUpTypeLiveToPro('sms')).toBe('whatsapp');
    expect(followUpTypeLiveToPro('in-person')).toBe('other');
    expect(followUpTypeLiveToPro('call')).toBe('call');
  });

  it('normalizes lead source strings including QR and ads', () => {
    expect(normalizeLeadSource('Instagram')).toBe('instagram');
    expect(normalizeLeadSource('web')).toBe('website');
    expect(normalizeLeadSource('Friend')).toBe('referral');
    expect(normalizeLeadSource('wa')).toBe('whatsapp');
    expect(normalizeLeadSource('QR')).toBe('qr');
    expect(normalizeLeadSource('ads')).toBe('ads');
    expect(normalizeLeadSource('')).toBe('other');
  });

  it('exposes canonical events and keeps trial events as deprecated leftovers', () => {
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('lead.created');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('enrollment.form.submitted');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('first_class.scheduled');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('class.attended');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('enrollment.link.prepared');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('whatsapp.opened');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).toContain('whatsapp.sent_confirmed');
    expect(PESKIDS_CANONICAL_EVENT_NAMES).not.toContain('trial.scheduled');
    expect(PESKIDS_DEPRECATED_TRIAL_EVENT_NAMES).toContain('trial.scheduled');
    expect(PESKIDS_PRO_EVENT_NAMES).toContain('student.enrolled');
  });
});
