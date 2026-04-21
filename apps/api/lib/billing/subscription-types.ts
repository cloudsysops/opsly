import { z } from 'zod';

// ─── Limits ──────────────────────────────────────────────────

const MAX_PLAN_ID_LENGTH = 50;
const ISO_CURRENCY_LENGTH = 3;

// ─── DB row types ────────────────────────────────────────────

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing' | 'paused';
export type BillingPeriod = 'monthly' | 'yearly';

export interface BillingSubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  amount_cents: number;
  currency: string;
  current_period_start: string | null;
  current_period_end: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
}

export interface BillingPlanRow {
  id: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  yearly_price_cents: number;
  currency: string;
  features: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface MeteringEventRow {
  id: string;
  tenant_id: string;
  metric_type: string;
  quantity: number;
  reported_at: string;
  period_month: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Validation schemas ──────────────────────────────────────

export const CreateSubscriptionSchema = z.object({
  plan_id: z.string().min(1).max(MAX_PLAN_ID_LENGTH),
  billing_period: z.enum(['monthly', 'yearly']).default('monthly'),
  stripe_customer_id: z.string().optional(),
});

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>;

export const ReportMeteringEventSchema = z.object({
  metric_type: z.string().min(1),
  quantity: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional(),
});

export type ReportMeteringEventInput = z.infer<typeof ReportMeteringEventSchema>;

export const CreateInvoiceSimpleSchema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().optional(),
  description: z.string().min(1),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(ISO_CURRENCY_LENGTH).default('COP'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type CreateInvoiceSimpleInput = z.infer<typeof CreateInvoiceSimpleSchema>;
