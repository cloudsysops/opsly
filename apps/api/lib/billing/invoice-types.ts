import { z } from 'zod';

// ─── DB row types ────────────────────────────────────────────

export interface InvoiceRow {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string | null;
  status: InvoiceStatus;
  subtotal_cents: number;
  tax_rate_percent: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  issue_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  stripe_invoice_id: string | null;
  notes: string | null;
  pdf_storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LineItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export interface CustomerRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  company_name: string | null;
  billing_address: Record<string, unknown> | null;
  stripe_customer_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

// ─── Enums ───────────────────────────────────────────────────

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'void';

// ─── Validation limits ───────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 500;
const MAX_CATEGORY_LENGTH = 100;
const MAX_CUSTOMER_NAME_LENGTH = 200;
const MAX_LINE_ITEMS = 50;
const CURRENCY_CODE_LENGTH = 3;
const MAX_TAX_PERCENT = 100;
const MAX_NOTES_LENGTH = 2000;
const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;

// ─── Validation schemas ──────────────────────────────────────

export const LineItemInput = z.object({
  description: z.string().min(1).max(MAX_DESCRIPTION_LENGTH),
  quantity: z.number().int().positive().default(1),
  unit_price_cents: z.number().int().nonnegative(),
  category: z.string().max(MAX_CATEGORY_LENGTH).optional(),
});

export const CreateInvoiceSchema = z.object({
  customer_email: z.string().email(),
  customer_name: z.string().max(MAX_CUSTOMER_NAME_LENGTH).optional(),
  line_items: z.array(LineItemInput).min(1).max(MAX_LINE_ITEMS),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  currency: z.string().length(CURRENCY_CODE_LENGTH).default('COP'),
  tax_rate_percent: z.number().min(0).max(MAX_TAX_PERCENT).default(0),
  notes: z.string().max(MAX_NOTES_LENGTH).optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['sent', 'paid', 'cancelled', 'void']),
});

export const ListInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'void']).optional(),
});

// ─── API response types ──────────────────────────────────────

export interface InvoiceWithLineItems extends InvoiceRow {
  line_items: LineItemRow[];
}
