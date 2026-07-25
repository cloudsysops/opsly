import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { earnPoints, redeemPoints, initializeStudentPoints } from './points.service';

export type ReferralLink = Database['peskids']['Tables']['referral_links']['Row'];

const REFERRAL_DISCOUNT_PERCENT = 10; // 10% discount on purchases (legacy, may be removed)
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
 * Process store checkout with optional referral discount and point earning/redemption
 */
export async function processStoreCheckout(input: {
  studentId: string;
  cartItems: Array<{ productId: string; quantity: number; unitPriceCents: number }>;
  totalCents: number;
  referralCode?: string;
  pointsToRedeem?: number;
  stripePaymentIntentId?: string;
  wompiTransactionId?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  totalCents: number;
  discountCents: number;
  finalAmountCents: number;
  pointsEarned: number;
  pointsRedeemed: number;
  pointsDiscountCents: number;
  referralCodeUsed?: string;
  error?: string;
}> {
  let discountCents = 0;
  let finalAmountCents = input.totalCents;
  let referralCodeUsed: string | undefined;
  let pointsEarned = 0;
  let pointsRedeemed = 0;
  let pointsDiscountCents = 0;

  // Validate referral code if provided (legacy, may be removed)
  if (input.referralCode) {
    const validation = await validateReferralCode(input.referralCode);

    if (!validation.isValid) {
      return {
        success: false,
        totalCents: input.totalCents,
        discountCents: 0,
        finalAmountCents: input.totalCents,
        pointsEarned: 0,
        pointsRedeemed: 0,
        pointsDiscountCents: 0,
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
    }
  }

  // Handle point redemption if provided
  if (input.pointsToRedeem && input.pointsToRedeem > 0) {
    const redemption = await redeemPoints({
      studentId: input.studentId,
      pointsToRedeem: input.pointsToRedeem,
      copAmount: finalAmountCents, // Apply points to already-discounted amount
      description: 'Descuento en compra de tienda',
    });

    if (redemption.success) {
      pointsRedeemed = redemption.pointsRedeemed;
      pointsDiscountCents = redemption.discountCents;
      finalAmountCents -= redemption.discountCents;
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
      discount_cents: discountCents + pointsDiscountCents,
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
      pointsEarned: 0,
      pointsRedeemed: 0,
      pointsDiscountCents: 0,
      error: 'Failed to create order',
    };
  }

  const orderId = orderData.id;

  // Create order items
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
    }
  }

  // Earn points from this purchase (in COP: totalCents / 100)
  const copAmount = input.totalCents / 100;
  try {
    const pointsResult = await earnPoints({
      studentId: input.studentId,
      copAmount,
      description: 'Compra en tienda',
      relatedOrderId: orderId,
    });
    pointsEarned = pointsResult.pointsEarned;
  } catch (err) {
    console.error('Failed to earn points:', err);
    // Don't fail checkout if point earning fails
  }

  return {
    success: true,
    orderId,
    totalCents: input.totalCents,
    discountCents: discountCents + pointsDiscountCents,
    finalAmountCents,
    pointsEarned,
    pointsRedeemed,
    pointsDiscountCents,
    referralCodeUsed,
  };
}

/**
 * Apply points for class enrollment payment
 */
export async function applyPointsToEnrollmentPayment(input: {
  studentId: string;
  paymentId: string;
  totalCents: number;
  pointsToRedeem?: number;
}): Promise<{
  success: boolean;
  pointsEarned: number;
  pointsRedeemed: number;
  pointsDiscountCents: number;
  finalAmountCents: number;
  error?: string;
}> {
  let finalAmountCents = input.totalCents;
  let pointsEarned = 0;
  let pointsRedeemed = 0;
  let pointsDiscountCents = 0;

  // Handle point redemption if provided
  if (input.pointsToRedeem && input.pointsToRedeem > 0) {
    const redemption = await redeemPoints({
      studentId: input.studentId,
      pointsToRedeem: input.pointsToRedeem,
      copAmount: finalAmountCents,
      description: 'Descuento en pago de clase individual',
      relatedPaymentId: input.paymentId,
    });

    if (redemption.success) {
      pointsRedeemed = redemption.pointsRedeemed;
      pointsDiscountCents = redemption.discountCents;
      finalAmountCents -= redemption.discountCents;
    } else {
      return {
        success: false,
        pointsEarned: 0,
        pointsRedeemed: 0,
        pointsDiscountCents: 0,
        finalAmountCents: input.totalCents,
        error: redemption.error,
      };
    }
  }

  // Earn points from this payment
  const copAmount = input.totalCents / 100;
  try {
    const pointsResult = await earnPoints({
      studentId: input.studentId,
      copAmount,
      description: 'Pago de clase individual',
      relatedPaymentId: input.paymentId,
    });
    pointsEarned = pointsResult.pointsEarned;
  } catch (err) {
    console.error('Failed to earn points:', err);
  }

  return {
    success: true,
    pointsEarned,
    pointsRedeemed,
    pointsDiscountCents,
    finalAmountCents,
  };
}

/**
 * Apply points for monthly subscription payment
 */
export async function applyPointsToSubscription(input: {
  studentId: string;
  subscriptionId: string;
  monthlyPriceCents: number;
  pointsToRedeem?: number;
}): Promise<{
  success: boolean;
  pointsEarned: number;
  pointsRedeemed: number;
  pointsDiscountCents: number;
  finalMonthlyCents: number;
  error?: string;
}> {
  let finalMonthlyCents = input.monthlyPriceCents;
  let pointsEarned = 0;
  let pointsRedeemed = 0;
  let pointsDiscountCents = 0;

  // Handle point redemption if provided
  if (input.pointsToRedeem && input.pointsToRedeem > 0) {
    const redemption = await redeemPoints({
      studentId: input.studentId,
      pointsToRedeem: input.pointsToRedeem,
      copAmount: finalMonthlyCents,
      description: 'Descuento en pago de mensualidad',
      relatedSubscriptionId: input.subscriptionId,
    });

    if (redemption.success) {
      pointsRedeemed = redemption.pointsRedeemed;
      pointsDiscountCents = redemption.discountCents;
      finalMonthlyCents -= redemption.discountCents;
    } else {
      return {
        success: false,
        pointsEarned: 0,
        pointsRedeemed: 0,
        pointsDiscountCents: 0,
        finalMonthlyCents: input.monthlyPriceCents,
        error: redemption.error,
      };
    }
  }

  // Earn points from this payment
  const copAmount = input.monthlyPriceCents / 100;
  try {
    const pointsResult = await earnPoints({
      studentId: input.studentId,
      copAmount,
      description: 'Pago de mensualidad',
      relatedSubscriptionId: input.subscriptionId,
    });
    pointsEarned = pointsResult.pointsEarned;
  } catch (err) {
    console.error('Failed to earn points:', err);
  }

  return {
    success: true,
    pointsEarned,
    pointsRedeemed,
    pointsDiscountCents,
    finalMonthlyCents,
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
