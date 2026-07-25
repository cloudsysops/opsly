import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type StudentPoints = Database['peskids']['Tables']['student_points']['Row'];
export type PointTransaction = Database['peskids']['Tables']['point_transactions']['Row'];

const POINTS_RATIO = 10000; // 1 point = 10,000 COP
const REDEEM_POINTS_FOR_DISCOUNT = 10; // 10 points = 10% discount
const DISCOUNT_PERCENT = 10; // 10%

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

// ========================
// POINTS INITIALIZATION
// ========================

export async function initializeStudentPoints(studentId: string): Promise<StudentPoints> {
  const { data: existing } = await peskidsClient()
    .from('student_points')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .single();

  if (existing) {
    return existing;
  }

  const { data, error } = await peskidsClient()
    .from('student_points')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: studentId,
      current_balance: 0,
      total_earned: 0,
      total_redeemed: 0,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as StudentPoints;
}

// ========================
// POINTS EARNING
// ========================

/**
 * Calculate points earned from COP amount
 * Formula: COP amount / 10,000 = points
 */
export function calculatePointsFromCOP(copAmount: number): number {
  return Math.floor(copAmount / POINTS_RATIO);
}

/**
 * Add points to student balance after purchase
 */
export async function earnPoints(input: {
  studentId: string;
  copAmount: number;
  description: string;
  relatedOrderId?: string;
  relatedSubscriptionId?: string;
  relatedPaymentId?: string;
}): Promise<{
  pointsEarned: number;
  newBalance: number;
}> {
  const pointsEarned = calculatePointsFromCOP(input.copAmount);

  if (pointsEarned === 0) {
    return { pointsEarned: 0, newBalance: 0 };
  }

  // Initialize if needed
  await initializeStudentPoints(input.studentId);

  // Add transaction log
  const { error: txError } = await peskidsClient()
    .from('point_transactions')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: input.studentId,
      transaction_type: 'earned',
      points_amount: pointsEarned,
      description: input.description,
      related_order_id: input.relatedOrderId || null,
      related_subscription_id: input.relatedSubscriptionId || null,
      related_payment_id: input.relatedPaymentId || null,
    });

  if (txError) throw txError;

  // Update balance
  const { data, error } = await peskidsClient()
    .from('student_points')
    .update({
      current_balance: supabaseServer().rpc('increment', {
        table_name: 'student_points',
        column_name: 'current_balance',
        amount: pointsEarned,
      }),
      total_earned: supabaseServer().rpc('increment', {
        table_name: 'student_points',
        column_name: 'total_earned',
        amount: pointsEarned,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', input.studentId)
    .select('current_balance')
    .single();

  if (error) {
    // Fallback: fetch current balance
    const { data: current } = await peskidsClient()
      .from('student_points')
      .select('current_balance')
      .eq('tenant_slug', tenantSlug())
      .eq('student_id', input.studentId)
      .single();

    return {
      pointsEarned,
      newBalance: current?.current_balance || 0,
    };
  }

  return {
    pointsEarned,
    newBalance: data?.current_balance || 0,
  };
}

// ========================
// POINTS REDEMPTION
// ========================

/**
 * Calculate discount from redeeming points
 * 10 points = 10% discount
 */
export function calculateDiscountFromPoints(pointsToRedeem: number): {
  canRedeem: boolean;
  discountPercent: number;
  pointsNeeded: number;
} {
  if (pointsToRedeem < REDEEM_POINTS_FOR_DISCOUNT) {
    return {
      canRedeem: false,
      discountPercent: 0,
      pointsNeeded: REDEEM_POINTS_FOR_DISCOUNT - pointsToRedeem,
    };
  }

  return {
    canRedeem: true,
    discountPercent: DISCOUNT_PERCENT,
    pointsNeeded: 0,
  };
}

/**
 * Redeem points for discount
 */
export async function redeemPoints(input: {
  studentId: string;
  pointsToRedeem: number;
  copAmount: number;
  description: string;
  relatedOrderId?: string;
  relatedSubscriptionId?: string;
  relatedPaymentId?: string;
}): Promise<{
  success: boolean;
  pointsRedeemed: number;
  discountCents: number;
  newBalance: number;
  error?: string;
}> {
  // Get current balance
  const { data: points, error: fetchError } = await peskidsClient()
    .from('student_points')
    .select('current_balance')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', input.studentId)
    .single();

  if (fetchError || !points) {
    return {
      success: false,
      pointsRedeemed: 0,
      discountCents: 0,
      newBalance: 0,
      error: 'Student points not found',
    };
  }

  // Check if student has enough points
  if (points.current_balance < input.pointsToRedeem) {
    return {
      success: false,
      pointsRedeemed: 0,
      discountCents: 0,
      newBalance: points.current_balance,
      error: `Insufficient points. Need ${input.pointsToRedeem}, have ${points.current_balance}`,
    };
  }

  // Check if points are in multiples of 10
  if (input.pointsToRedeem % REDEEM_POINTS_FOR_DISCOUNT !== 0) {
    return {
      success: false,
      pointsRedeemed: 0,
      discountCents: 0,
      newBalance: points.current_balance,
      error: `Points must be redeemed in multiples of ${REDEEM_POINTS_FOR_DISCOUNT}`,
    };
  }

  // Calculate discount: 10 points = 10% discount
  const discountPercentPerTenPoints = DISCOUNT_PERCENT;
  const numTenPointBatches = input.pointsToRedeem / REDEEM_POINTS_FOR_DISCOUNT;
  const discountCents = Math.round(
    (input.copAmount * (discountPercentPerTenPoints * numTenPointBatches)) / 100
  );

  // Add transaction log
  const { error: txError } = await peskidsClient()
    .from('point_transactions')
    .insert({
      tenant_slug: tenantSlug(),
      student_id: input.studentId,
      transaction_type: 'redeemed',
      points_amount: input.pointsToRedeem,
      description: input.description,
      related_order_id: input.relatedOrderId || null,
      related_subscription_id: input.relatedSubscriptionId || null,
      related_payment_id: input.relatedPaymentId || null,
    });

  if (txError) throw txError;

  // Deduct from balance
  const { data: updated, error: updateError } = await peskidsClient()
    .from('student_points')
    .update({
      current_balance: points.current_balance - input.pointsToRedeem,
      total_redeemed: supabaseServer().rpc('increment', {
        table_name: 'student_points',
        column_name: 'total_redeemed',
        amount: input.pointsToRedeem,
      }),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', input.studentId)
    .select('current_balance')
    .single();

  if (updateError) {
    return {
      success: false,
      pointsRedeemed: 0,
      discountCents: 0,
      newBalance: points.current_balance,
      error: 'Failed to redeem points',
    };
  }

  return {
    success: true,
    pointsRedeemed: input.pointsToRedeem,
    discountCents,
    newBalance: updated?.current_balance || 0,
  };
}

// ========================
// POINTS QUERIES
// ========================

export async function getStudentPoints(studentId: string): Promise<StudentPoints | null> {
  const { data, error } = await peskidsClient()
    .from('student_points')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as StudentPoints | null;
}

export async function getPointsHistory(
  studentId: string,
  limit: number = 50
): Promise<PointTransaction[]> {
  const { data, error } = await peskidsClient()
    .from('point_transactions')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PointTransaction[];
}

/**
 * Admin: get all students with their points (paginated)
 */
export async function getAllStudentPoints(filters?: {
  minPoints?: number;
  maxPoints?: number;
  offset?: number;
  limit?: number;
}): Promise<{
  students: (StudentPoints & { student_name?: string })[];
  total: number;
}> {
  let query = peskidsClient()
    .from('student_points')
    .select('*', { count: 'exact' })
    .eq('tenant_slug', tenantSlug());

  if (filters?.minPoints !== undefined) {
    query = query.gte('current_balance', filters.minPoints);
  }

  if (filters?.maxPoints !== undefined) {
    query = query.lte('current_balance', filters.maxPoints);
  }

  const { data, error, count } = await query
    .order('current_balance', { ascending: false })
    .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

  if (error) throw error;
  return {
    students: (data ?? []) as StudentPoints[],
    total: count || 0,
  };
}
