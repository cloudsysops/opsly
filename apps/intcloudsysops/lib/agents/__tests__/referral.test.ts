import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GhlReferralService } from '../../services/gohighlevel/referral.service';
import type { GoHighLevelClient, Contact } from '@intcloudsysops/services/gohighlevel';

function createMockClient(): GoHighLevelClient {
  return {
    getContacts: vi.fn(),
    getContact: vi.fn(),
    createContact: vi.fn(),
    updateContact: vi.fn(),
    sendMessage: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    getTasks: vi.fn(),
    getAppointments: vi.fn(),
    updateOpportunityStageForContact: vi.fn(),
    addContactTags: vi.fn(),
    listTags: vi.fn(),
    deleteContact: vi.fn(),
    searchOpportunities: vi.fn(),
  } as unknown as GoHighLevelClient;
}

function makeContact(overrides: Partial<Contact> & { id: string }): Contact {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Test Contact',
    email: overrides.email,
    phone: overrides.phone,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    source: overrides.source,
    status: overrides.status,
    customFields: overrides.customFields,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  };
}

describe('GhlReferralService', () => {
  let mockClient: GoHighLevelClient;
  let service: GhlReferralService;

  beforeEach(() => {
    mockClient = createMockClient();
    service = new GhlReferralService(mockClient);
  });

  describe('storeReferralCode', () => {
    it('stores referral code as custom field and adds tag', async () => {
      vi.mocked(mockClient.updateContact).mockResolvedValue(
        makeContact({ id: 'c1' })
      );
      vi.mocked(mockClient.addContactTags).mockResolvedValue(undefined);

      const result = await service.storeReferralCode('c1', 'PK-ABC123');

      expect(result).toBe(true);
      expect(mockClient.updateContact).toHaveBeenCalledWith('c1', {
        customFields: { referral_code: 'PK-ABC123' },
      });
      expect(mockClient.addContactTags).toHaveBeenCalledWith('c1', [
        'referral_code_set',
      ]);
    });

    it('returns false when update fails', async () => {
      vi.mocked(mockClient.updateContact).mockRejectedValue(
        new Error('GHL error')
      );

      const result = await service.storeReferralCode('c1', 'PK-ABC123');
      expect(result).toBe(false);
    });
  });

  describe('linkReferral', () => {
    it('stores referred_by_code and adds referred tag', async () => {
      vi.mocked(mockClient.updateContact).mockResolvedValue(
        makeContact({ id: 'c2' })
      );
      vi.mocked(mockClient.addContactTags).mockResolvedValue(undefined);

      const result = await service.linkReferral('c2', 'pk-def456');

      expect(result).toBe(true);
      expect(mockClient.updateContact).toHaveBeenCalledWith('c2', {
        customFields: { referred_by_code: 'PK-DEF456' },
      });
      expect(mockClient.addContactTags).toHaveBeenCalledWith('c2', [
        'referred',
      ]);
    });

    it('normalizes referral code to uppercase', async () => {
      vi.mocked(mockClient.updateContact).mockResolvedValue(
        makeContact({ id: 'c2' })
      );
      vi.mocked(mockClient.addContactTags).mockResolvedValue(undefined);

      await service.linkReferral('c2', '  pk-abc-123  ');

      expect(mockClient.updateContact).toHaveBeenCalledWith('c2', {
        customFields: { referred_by_code: 'PK-ABC-123' },
      });
    });

    it('returns false for empty referral code', async () => {
      const result = await service.linkReferral('c2', '');
      expect(result).toBe(false);
    });

    it('returns false when update fails', async () => {
      vi.mocked(mockClient.updateContact).mockRejectedValue(
        new Error('GHL error')
      );

      const result = await service.linkReferral('c2', 'PK-ABC123');
      expect(result).toBe(false);
    });
  });

  describe('markReferralRedeemed', () => {
    it('adds referral_redeemed tag and stores discount', async () => {
      vi.mocked(mockClient.addContactTags).mockResolvedValue(undefined);
      vi.mocked(mockClient.updateContact).mockResolvedValue(
        makeContact({ id: 'c1' })
      );

      const result = await service.markReferralRedeemed('c1', 1000);

      expect(result).toBe(true);
      expect(mockClient.addContactTags).toHaveBeenCalledWith('c1', [
        'referral_redeemed',
      ]);
      expect(mockClient.updateContact).toHaveBeenCalledWith('c1', {
        customFields: { referral_discount_cents: 1000 },
      });
    });

    it('returns false on failure', async () => {
      vi.mocked(mockClient.addContactTags).mockRejectedValue(
        new Error('GHL error')
      );

      const result = await service.markReferralRedeemed('c1', 1000);
      expect(result).toBe(false);
    });
  });

  describe('getReferralStats', () => {
    it('returns stats from custom fields', async () => {
      vi.mocked(mockClient.getContact).mockResolvedValue(
        makeContact({
          id: 'c1',
          customFields: {
            referral_sent: 3,
            referral_converted: 1,
            referral_discount_cents: 1000,
          },
        })
      );

      const stats = await service.getReferralStats('c1');

      expect(stats.sent).toBe(3);
      expect(stats.converted).toBe(1);
      expect(stats.earnedDiscount).toBe(1000);
    });

    it('returns zeros when no custom fields exist', async () => {
      vi.mocked(mockClient.getContact).mockResolvedValue(
        makeContact({ id: 'c1', customFields: {} })
      );

      const stats = await service.getReferralStats('c1');

      expect(stats.sent).toBe(0);
      expect(stats.converted).toBe(0);
      expect(stats.earnedDiscount).toBe(0);
    });

    it('returns zeros when contact fetch fails', async () => {
      vi.mocked(mockClient.getContact).mockRejectedValue(
        new Error('Not found')
      );

      const stats = await service.getReferralStats('c1');

      expect(stats.sent).toBe(0);
      expect(stats.converted).toBe(0);
      expect(stats.earnedDiscount).toBe(0);
    });
  });
});
