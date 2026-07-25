import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type ReferralLink = Database['peskids']['Tables']['referral_links']['Row'];

const REFERRAL_DISCOUNT_PERCENT = 10; // 10% discount on purchases
const REFERRAL_DISCOUNT_MULTIPLIER = 1 - REFERRAL_DISCOUNT_PERCENT / 100; // 0.9

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function publicClient() {
  return supabaseServer().schema('public');
}

// ========================
// REFERRAL VALIDATION
// ========================

/**
 * Validates if a referral code is valid and can be applied to a purchase
 */
export async function validateReferralCode(referralCode: string): Promise<{
  isValid: boolean;
  error?: string;
  referrerId?: string;
}> {
  if (!referralCode || !referralCode.startsWith('PK-')) {
    return {
      isValid: false,
      error: 'Invalid referral code format. Code should start with PK-',
    };
  }

  // Check if referral link exists and is valid
  const { data: refLink, error: refError } = await peskidsClient()
    .from('referral_links')
    .select('id, referrer_id, expires_at')
    .eq('code', referralCode)
    .eq('tenant_slug', tenantSlug())
    .single();

  if (refError || !refLink) {
    return {
      isValid: false,
      error: 'Referral code not found',
    };
  }

  // Check if referral link has expired (90 days default)
  if (refLink.expires_at && new Date(refLink.expires_at) < new Date()) {
    return {
      isValid: false,
      error: 'Referral code has expired',
    };
  }

  return {
    isValid: true,
    referrerId: refLink.referrer_id,
  };
}

// ========================
// DISCOUNT CALCULATION
// ========================

/**
 * Calculates 10% discount on a purchase amount
 */
export function calculateDiscount(totalCents: number): {
  discountCents: number;
  finalAmountCents: number;
} {
  const discountCents = Math.round(totalCents * (REFERRAL_DISCOUNT_PERCENT / 100));
  const finalAmountCents = totalCents - discountCents;

  return {
    discountCents,
    finalAmountCents,
  };
}

// ========================
// CHECKOUT FLOW
// ========================

/**
 * Process store checkout with optional referral discount
 */
export async function processStoreCheckout(input: {
  studentId: string;
  cartItems: Array<{ productId: string; quantity: number; unitPriceCents: number }>;
  totalCents: number;
  referralCode?: string;
  stripePaymentIntentId?: string;
  wompiTransactionId?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  totalCents: number;
  discountCents: number;
  finalAmountCents: number;
  referralCodeUsed?: string;
  error?: string;
}> {
  let discountCents = 0;
  let finalAmountCents = input.totalCents;
  let referralCodeUsed: string | undefined;

  // Validate referral code if provided
  if (input.referralCode) {
    const validation = await validateReferralCode(input.referralCode);

    if (!validation.isValid) {
      return {
        success: false,
        totalCents: input.totalCents,
        discountCents: 0,
        finalAmountCents: input.totalCents,
        error: validation.error || 'Invalid referral code',
      };
    }

    // Calculate discount
    const discount = calculateDiscount(input.totalCents);
    discountCents = discount.discountCents;
    finalAmountCents = discount.finalAmountCents;
    referralCodeUsed = input.referralCode;

    // Track referral redemption
    try {
      await trackReferralRedemption(input.referralCode, input.studentId, discountCents);
    } catch (err) {
      console.error('Failed to track referral redemption:', err);
      // Don't fail checkout if tracking fails, just log it
    }
  }

  // Create order
  const db = supabaseServer().schema('peskids') as any;
  const { data: orderData, error: orderError } = await db
    .from('store_orders')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: input.studentId,
      total_cents: input.totalCents,
      discount_cents: discountCents,
      final_amount_cents: finalAmountCents,
      referral_code_used: referralCodeUsed || null,
      payment_status: 'completed',
      stripe_payment_intent_id: input.stripePaymentIntentId || null,
      wompi_transaction_id: input.wompiTransactionId || null,
      completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (orderError) {
    return {
      success: false,
      totalCents: input.totalCents,
      discountCents,
      finalAmountCents,
      error: 'Failed to create order',
    };
  }

  // Create order items
  const orderId = orderData.id;
  if (input.cartItems.length > 0) {
    const { error: itemsError } = await db.from('store_order_items').insert(
      input.cartItems.map((item) => ({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
      }))
    );

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
      // Order created but items failed - this is a partial failure
    }
  }

  return {
    success: true,
    orderId,
    totalCents: input.totalCents,
    discountCents,
    finalAmountCents,
    referralCodeUsed,
  };
}

/**
 * Apply referral discount to class enrollment payment
 */
export async function applyReferralToEnrollmentPayment(input: {
  enrollmentPaymentId: string;
  referralCode: string;
  totalCents: number;
}): Promise<{
  success: boolean;
  discountCents: number;
  finalAmountCents: number;
  error?: string;
}> {
  // Validate referral code
  const validation = await validateReferralCode(input.referralCode);

  if (!validation.isValid) {
    return {
      success: false,
      discountCents: 0,
      finalAmountCents: input.totalCents,
      error: validation.error || 'Invalid referral code',
    };
  }

  // Calculate discount
  const { discountCents, finalAmountCents } = calculateDiscount(input.totalCents);

  // Update payment record with referral discount info
  // The actual payment update would be done by the enrollment service
  // This just calculates and returns the discount

  return {
    success: true,
    discountCents,
    finalAmountCents,
  };
}

/**
 * Apply referral discount to monthly subscription
 */
export async function applyReferralToSubscription(input: {
  subscriptionId: string;
  referralCode: string;
  monthlyPriceCents: number;
}): Promise<{
  success: boolean;
  discountCents: number;
  finalMonthlyCents: number;
  error?: string;
}> {
  // Validate referral code
  const validation = await validateReferralCode(input.referralCode);

  if (!validation.isValid) {
    return {
      success: false,
      discountCents: 0,
      finalMonthlyCents: input.monthlyPriceCents,
      error: validation.error || 'Invalid referral code',
    };
  }

  // Calculate discount
  const { discountCents, finalAmountCents } = calculateDiscount(input.monthlyPriceCents);

  // Update subscription record with referral discount info
  // The actual subscription update would be done by the subscription service

  return {
    success: true,
    discountCents,
    finalMonthlyCents: finalAmountCents,
  };
}

// ========================
// REFERRAL TRACKING
// ========================

/**
 * Track when a referral code is used for a discount
 */
async function trackReferralRedemption(
  referralCode: string,
  refereContactId: string,
  discountAmount: number
): Promise<void> {
  const { error } = await peskidsClient()
    .from('referral_redemptions')
    .insert({
      tenant_slug: tenantSlug(),
      referral_code: referralCode,
      referee_contact_id: refereContactId,
      reward: discountAmount,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to track referral redemption: ${error.message}`);
  }
}

/**
 * Get referral stats for a referrer
 */
export async function getReferralRedemptionStats(referrerContactId: string): Promise<{
  totalRedemptions: number;
  totalDiscountGiven: number;
  recentRedemptions: Array<{
    code: string;
    completedAt: string;
    discountAmount: number;
  }>;
}> {
  const { data, error } = await peskidsClient()
    .from('referral_redemptions')
    .select('referral_code, reward, completed_at')
    .eq('tenant_slug', tenantSlug())
    // Note: This would need to be joined with referral_links to get referrer_id
    // For now, this is a placeholder that would need schema adjustment
    .order('completed_at', { ascending: false });

  if (error) {
    throw error;
  }

  const redemptions = (data ?? []) as any[];

  return {
    totalRedemptions: redemptions.length,
    totalDiscountGiven: redemptions.reduce((sum, r) => sum + (r.reward || 0), 0),
    recentRedemptions: redemptions.slice(0, 10).map((r) => ({
      code: r.referral_code,
      completedAt: r.completed_at,
      discountAmount: r.reward,
    })),
  };
}
