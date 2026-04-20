import { getServiceClient } from '../supabase';
import type {
  CreateInvoiceInput,
  CustomerRow,
  InvoiceRow,
  InvoiceStatus,
  InvoiceWithLineItems,
  LineItemRow,
} from './invoice-types';

// ─── Invoice number generation ───────────────────────────────

const INVOICE_NUMBER_PAD_WIDTH = 4;
const DATE_SLICE_END = 10;
const PERCENT_DIVISOR = 100;

function padNumber(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

async function generateInvoiceNumber(tenantId: string, tenantSlug: string): Promise<string> {
  const db = getServiceClient();
  const { count } = await db
    .schema('platform')
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  const next = (count ?? 0) + 1;
  return `INV-${tenantSlug}-${padNumber(next, INVOICE_NUMBER_PAD_WIDTH)}`;
}

// ─── Customer upsert ─────────────────────────────────────────

async function ensureCustomer(
  tenantId: string,
  email: string,
  name: string | undefined
): Promise<CustomerRow> {
  const db = getServiceClient();

  // Try to find existing customer
  const { data: existing } = await db
    .schema('platform')
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return existing as CustomerRow;
  }

  // Create new customer
  const { data: created, error } = await db
    .schema('platform')
    .from('customers')
    .insert({
      tenant_id: tenantId,
      email,
      name: name ?? null,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return created as CustomerRow;
}

// ─── Create invoice ──────────────────────────────────────────

type ComputedLineItem = {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  category: string | null;
  sort_order: number;
};

function computeLineItems(items: CreateInvoiceInput['line_items']): {
  lineItems: ComputedLineItem[];
  subtotalCents: number;
} {
  const lineItems = items.map((item, idx) => ({
    description: item.description,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    total_cents: item.quantity * item.unit_price_cents,
    category: item.category ?? null,
    sort_order: idx,
  }));
  const subtotalCents = lineItems.reduce((sum, li) => sum + li.total_cents, 0);
  return { lineItems, subtotalCents };
}

async function insertLineItems(
  db: ReturnType<typeof getServiceClient>,
  invoiceId: string,
  items: ComputedLineItem[]
): Promise<LineItemRow[]> {
  const inserts = items.map((li) => ({ invoice_id: invoiceId, ...li }));
  const { data, error } = await db
    .schema('platform')
    .from('invoice_line_items')
    .insert(inserts)
    .select('*');

  if (error) {
    throw new Error(`Failed to create line items: ${error.message}`);
  }
  return (data ?? []) as LineItemRow[];
}

export async function createInvoice(
  tenantId: string,
  tenantSlug: string,
  input: CreateInvoiceInput
): Promise<InvoiceWithLineItems> {
  const db = getServiceClient();
  const customer = await ensureCustomer(tenantId, input.customer_email, input.customer_name);
  const invoiceNumber = await generateInvoiceNumber(tenantId, tenantSlug);

  const { lineItems: computed, subtotalCents } = computeLineItems(input.line_items);
  const taxCents = Math.round(subtotalCents * (input.tax_rate_percent / PERCENT_DIVISOR));
  const totalCents = subtotalCents + taxCents;

  const { data: invoice, error: invoiceError } = await db
    .schema('platform')
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      customer_email: input.customer_email,
      customer_name: input.customer_name ?? null,
      status: 'draft' as InvoiceStatus,
      subtotal_cents: subtotalCents,
      tax_rate_percent: input.tax_rate_percent,
      tax_cents: taxCents,
      total_cents: totalCents,
      currency: input.currency,
      issue_date: new Date().toISOString().slice(0, DATE_SLICE_END),
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (invoiceError) {
    throw new Error(`Failed to create invoice: ${invoiceError.message}`);
  }

  const invoiceRow = invoice as InvoiceRow;
  const lineItemRows = await insertLineItems(db, invoiceRow.id, computed);

  return { ...invoiceRow, line_items: lineItemRows };
}

// ─── List invoices ───────────────────────────────────────────

export async function listInvoices(
  tenantId: string,
  page: number,
  limit: number,
  status?: InvoiceStatus
): Promise<{ data: InvoiceRow[]; total: number }> {
  const db = getServiceClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = db
    .schema('platform')
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list invoices: ${error.message}`);
  }

  return {
    data: (data ?? []) as InvoiceRow[],
    total: count ?? 0,
  };
}

// ─── Get invoice by ID ──────────────────────────────────────

export async function getInvoiceById(
  tenantId: string,
  invoiceId: string
): Promise<InvoiceWithLineItems | null> {
  const db = getServiceClient();

  const { data: invoice, error: invoiceError } = await db
    .schema('platform')
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (invoiceError) {
    throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
  }

  if (!invoice) {
    return null;
  }

  const { data: lineItems, error: lineItemsError } = await db
    .schema('platform')
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true });

  if (lineItemsError) {
    throw new Error(`Failed to fetch line items: ${lineItemsError.message}`);
  }

  return {
    ...(invoice as InvoiceRow),
    line_items: (lineItems ?? []) as LineItemRow[],
  };
}

// ─── Update invoice status ───────────────────────────────────

export async function updateInvoiceStatus(
  tenantId: string,
  invoiceId: string,
  newStatus: InvoiceStatus
): Promise<InvoiceRow | null> {
  const db = getServiceClient();

  const updatePayload: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'paid') {
    updatePayload.paid_date = new Date().toISOString().slice(0, DATE_SLICE_END);
  }

  const { data, error } = await db
    .schema('platform')
    .from('invoices')
    .update(updatePayload)
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }

  return (data as InvoiceRow) ?? null;
}
