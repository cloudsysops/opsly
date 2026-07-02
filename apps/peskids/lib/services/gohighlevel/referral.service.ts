/** @deprecated LEGACY (GHL): referral code sync to GHL contacts — migrate to Twenty custom fields. */
import type { GoHighLevelClient } from '@intcloudsysops/services/gohighlevel';
import { normalizeReferralCode } from '../../peskids-referral-links';

export class GhlReferralService {
  constructor(private ghlClient: GoHighLevelClient) {}

  async storeReferralCode(
    ghlContactId: string,
    referralCode: string
  ): Promise<boolean> {
    try {
      await this.ghlClient.updateContact(ghlContactId, {
        customFields: { referral_code: referralCode },
      });
      await this.ghlClient.addContactTags(ghlContactId, ['referral_code_set']);
      return true;
    } catch {
      return false;
    }
  }

  async linkReferral(
    newContactId: string,
    referredByCode: string
  ): Promise<boolean> {
    try {
      const code = normalizeReferralCode(referredByCode);
      if (!code) return false;

      await this.ghlClient.updateContact(newContactId, {
        customFields: { referred_by_code: code },
      });
      await this.ghlClient.addContactTags(newContactId, ['referred']);

      return true;
    } catch {
      return false;
    }
  }

  async markReferralRedeemed(
    referrerContactId: string,
    discountCents: number
  ): Promise<boolean> {
    try {
      await this.ghlClient.addContactTags(referrerContactId, [
        'referral_redeemed',
      ]);
      await this.ghlClient.updateContact(referrerContactId, {
        customFields: { referral_discount_cents: discountCents },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getReferralStats(
    ghlContactId: string
  ): Promise<{
    sent: number;
    converted: number;
    earnedDiscount: number;
  }> {
    try {
      const contact = await this.ghlClient.getContact(ghlContactId);
      const fields = contact.customFields ?? {};
      return {
        sent: (fields.referral_sent as number) ?? 0,
        converted: (fields.referral_converted as number) ?? 0,
        earnedDiscount: (fields.referral_discount_cents as number) ?? 0,
      };
    } catch {
      return { sent: 0, converted: 0, earnedDiscount: 0 };
    }
  }
}
