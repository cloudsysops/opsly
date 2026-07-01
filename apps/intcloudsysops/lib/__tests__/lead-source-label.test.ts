import { describe, expect, it } from 'vitest';
import { normalizeLeadSourceLabel } from '@/lib/admin/lead-source-label';
import { mapAdminStatusToPlatform } from '@/lib/services/lead-admin.service';

describe('normalizeLeadSourceLabel', () => {
  it('maps website sources to Web', () => {
    expect(normalizeLeadSourceLabel('website')).toBe('Web');
    expect(normalizeLeadSourceLabel('Google')).toBe('Web');
  });

  it('maps instagram sources to Instagram', () => {
    expect(normalizeLeadSourceLabel('instagram')).toBe('Instagram');
    expect(normalizeLeadSourceLabel('instagram-pilot')).toBe('Instagram');
  });

  it('maps whatsapp sources to WhatsApp', () => {
    expect(normalizeLeadSourceLabel('whatsapp')).toBe('WhatsApp');
    expect(normalizeLeadSourceLabel('WhatsApp chat')).toBe('WhatsApp');
  });

  it('maps referral sources to Referido', () => {
    expect(normalizeLeadSourceLabel('referral')).toBe('Referido');
    expect(normalizeLeadSourceLabel('Friend')).toBe('Referido');
  });

  it('returns Otro for empty or unknown values', () => {
    expect(normalizeLeadSourceLabel(null)).toBe('Otro');
    expect(normalizeLeadSourceLabel('')).toBe('Otro');
    expect(normalizeLeadSourceLabel('Other')).toBe('Otro');
  });
});

describe('mapAdminStatusToPlatform', () => {
  it('maps admin statuses to platform status column', () => {
    expect(mapAdminStatusToPlatform('new')).toBe('new');
    expect(mapAdminStatusToPlatform('contacted')).toBe('contacted');
    expect(mapAdminStatusToPlatform('trial')).toBe('qualified');
    expect(mapAdminStatusToPlatform('enrolled')).toBe('converted');
    expect(mapAdminStatusToPlatform('archived')).toBe('lost');
  });
});
