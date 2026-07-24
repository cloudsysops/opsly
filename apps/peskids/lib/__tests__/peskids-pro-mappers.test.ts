import { describe, expect, it } from 'vitest';
import { PESKIDS_PRO_EVENT_NAMES } from '@/lib/events';
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
  'trial_scheduled',
  'trial_completed',
  'enrolled',
  'lost',
];

describe('peskids-pro mappers (PR-PRO-0 contracts)', () => {
  it('round-trips admin ↔ pro for coarse stages', () => {
    expect(adminLeadStatusToPro('new')).toBe('new');
    expect(adminLeadStatusToPro('contacted')).toBe('contacted');
    expect(adminLeadStatusToPro('trial')).toBe('trial_scheduled');
    expect(adminLeadStatusToPro('enrolled')).toBe('enrolled');
    expect(adminLeadStatusToPro('archived')).toBe('lost');

    expect(proLeadStatusToAdmin('trial_scheduled')).toBe('trial');
    expect(proLeadStatusToAdmin('trial_completed')).toBe('trial');
    expect(proLeadStatusToAdmin('lost')).toBe('archived');
  });

  it('round-trips platform ↔ pro for coarse stages', () => {
    expect(platformLeadStatusToPro('qualified')).toBe('trial_scheduled');
    expect(platformLeadStatusToPro('converted')).toBe('enrolled');
    expect(platformLeadStatusToPro('lost')).toBe('lost');

    expect(proLeadStatusToPlatform('trial_completed')).toBe('qualified');
    expect(proLeadStatusToPlatform('enrolled')).toBe('converted');
  });

  it('maps every Pro lead status to a Twenty stage slug', () => {
    const expected: Record<LeadStatus, string> = {
      new: 'NEW',
      contacted: 'CONTACTED',
      trial_scheduled: 'TRIAL_SCHEDULED',
      trial_completed: 'TRIAL_COMPLETED',
      enrolled: 'ENROLLED',
      lost: 'LOST',
    };
    for (const status of ALL_PRO_LEAD_STATUSES) {
      expect(proLeadStatusToTwentyStageSlug(status)).toBe(expected[status]);
    }
  });

  it('maps admin statuses to Twenty stage slugs via Pro', () => {
    expect(adminLeadStatusToTwentyStageSlug('contacted')).toBe('CONTACTED');
    expect(adminLeadStatusToTwentyStageSlug('trial')).toBe('TRIAL_SCHEDULED');
    expect(adminLeadStatusToTwentyStageSlug('enrolled')).toBe('ENROLLED');
    expect(adminLeadStatusToTwentyStageSlug('archived')).toBe('LOST');
  });

  it('aliases trial attended ↔ completed without changing live DB values', () => {
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

  it('normalizes lead source strings', () => {
    expect(normalizeLeadSource('Instagram')).toBe('instagram');
    expect(normalizeLeadSource('web')).toBe('website');
    expect(normalizeLeadSource('Friend')).toBe('referral');
    expect(normalizeLeadSource('wa')).toBe('whatsapp');
    expect(normalizeLeadSource('')).toBe('other');
  });

  it('exposes the Pro domain event catalog without wiring new emitters', () => {
    expect(PESKIDS_PRO_EVENT_NAMES).toContain('lead.created');
    expect(PESKIDS_PRO_EVENT_NAMES).toContain('student.enrolled');
    expect(PESKIDS_PRO_EVENT_NAMES).toContain('lead.renewal_due');
    expect(PESKIDS_PRO_EVENT_NAMES).toHaveLength(12);
  });
});
