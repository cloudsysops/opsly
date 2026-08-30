import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';
import type { InvoiceStatus, FranchiseeAccount } from '@prisma/client';

// Default royalty configuration
export const DEFAULT_ROYALTY_CONFIG = {
  royaltyPercent: 7.0, // 7%
  brandFundPercent: 2.0, // 2%
  systemsFeePercent: 1.0, // 1%
  // Total: 10%
};

// Invoice number format: INV-YYYY-MM-NNN
function generateInvoiceNumber(
  year: number,
  month: number,
  sequence: number
): string {
  const yearStr = year.toString();
  const monthStr = month.toString().padStart(2, '0');
  const seqStr = sequence.toString().padStart(3, '0');
  return `INV-${yearStr}-${monthStr}-${seqStr}`;
}

// Get the royalty configuration for a franchisee (or global default)
export async function getRoyaltyConfig(
  franchiseeAccountId?: string
): Promise<{
  royaltyPercent: number;
  brandFundPercent: number;
  systemsFeePercent: number;
  minimumMonthlyFee: number | null;
  maximumMonthlyFee: number | null;
}> {
  // First check for franchisee-specific config
  if (franchiseeAccountId) {
    const config = await db.royaltyConfig.findUnique({
      where: { franchiseeAccountId },
    });

    if (config) {
      return {
        royaltyPercent: Number(config.royaltyPercent),
        brandFundPercent: Number(config.brandFundPercent),
        systemsFeePercent: Number(config.systemsFeePercent),
        minimumMonthlyFee: config.minimumMonthlyFee
          ? Number(config.minimumMonthlyFee)
          : null,
        maximumMonthlyFee: config.maximumMonthlyFee
          ? Number(config.maximumMonthlyFee)
          : null,
      };
    }
  }

  // Fall back to global default
  const globalConfig = await db.royaltyConfig.findFirst({
    where: { franchiseeAccountId: null },
  });

  if (globalConfig) {
    return {
      royaltyPercent: Number(globalConfig.royaltyPercent),
      brandFundPercent: Number(globalConfig.brandFundPercent),
      systemsFeePercent: Number(globalConfig.systemsFeePercent),
      minimumMonthlyFee: globalConfig.minimumMonthlyFee
        ? Number(globalConfig.minimumMonthlyFee)
        : null,
      maximumMonthlyFee: globalConfig.maximumMonthlyFee
        ? Number(globalConfig.maximumMonthlyFee)
        : null,
    };
  }

  // Use hardcoded defaults if no config exists
  return {
    ...DEFAULT_ROYALTY_CONFIG,
    minimumMonthlyFee: null,
    maximumMonthlyFee: null,
  };
}

// Calculate royalty amounts from gross revenue
export function calculateRoyaltyAmounts(
  grossRevenue: number,
  config: {
    royaltyPercent: number;
    brandFundPercent: number;
    systemsFeePercent: number;
    minimumMonthlyFee: number | null;
    maximumMonthlyFee: number | null;
  }
): {
  royaltyAmount: number;
  brandFundAmount: number;
  systemsFeeAmount: number;
  totalAmount: number;
} {
  // Calculate each fee
  let royaltyAmount = grossRevenue * (config.royaltyPercent / 100);
  let brandFundAmount = grossRevenue * (config.brandFundPercent / 100);
  let systemsFeeAmount = grossRevenue * (config.systemsFeePercent / 100);
  let totalAmount = royaltyAmount + brandFundAmount + systemsFeeAmount;

  // Apply minimum/maximum caps
  if (config.minimumMonthlyFee && totalAmount < config.minimumMonthlyFee) {
    // Scale up proportionally to meet minimum
    const scaleFactor = config.minimumMonthlyFee / totalAmount;
    royaltyAmount *= scaleFactor;
    brandFundAmount *= scaleFactor;
    systemsFeeAmount *= scaleFactor;
    totalAmount = config.minimumMonthlyFee;
  } else if (config.maximumMonthlyFee && totalAmount > config.maximumMonthlyFee) {
    // Scale down proportionally to meet maximum
    const scaleFactor = config.maximumMonthlyFee / totalAmount;
    royaltyAmount *= scaleFactor;
    brandFundAmount *= scaleFactor;
    systemsFeeAmount *= scaleFactor;
    totalAmount = config.maximumMonthlyFee;
  }

  // Round to 2 decimal places
  return {
    royaltyAmount: Math.round(royaltyAmount * 100) / 100,
    brandFundAmount: Math.round(brandFundAmount * 100) / 100,
    systemsFeeAmount: Math.round(systemsFeeAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// Generate invoice for a single franchisee
export async function generateInvoiceForFranchisee(
  franchiseeAccountId: string,
  year: number,
  month: number
): Promise<{
  success: boolean;
  invoice?: Awaited<ReturnType<typeof db.royaltyInvoice.create>>;
  error?: string;
}> {
  // Get the TC snapshot for this month
  const snapshot = await db.tutorCruncherSnapshot.findUnique({
    where: {
      franchiseeAccountId_year_month: {
        franchiseeAccountId,
        year,
        month,
      },
    },
  });

  if (!snapshot) {
    return {
      success: false,
      error: `No TutorCruncher data found for ${year}/${month}. Run sync first.`,
    };
  }

  const grossRevenue = Number(snapshot.grossRevenue);

  // Skip if no revenue
  if (grossRevenue <= 0) {
    return {
      success: false,
      error: `No revenue for ${year}/${month} - skipping invoice generation.`,
    };
  }

  // Get royalty configuration
  const config = await getRoyaltyConfig(franchiseeAccountId);

  // Calculate amounts
  const amounts = calculateRoyaltyAmounts(grossRevenue, config);

  // Check if invoice already exists
  const existingInvoice = await db.royaltyInvoice.findUnique({
    where: {
      franchiseeAccountId_year_month: {
        franchiseeAccountId,
        year,
        month,
      },
    },
  });

  if (existingInvoice) {
    // Update existing draft invoice if not yet sent
    if (
      existingInvoice.status === 'DRAFT' ||
      existingInvoice.status === 'PENDING_REVIEW'
    ) {
      const updatedInvoice = await db.royaltyInvoice.update({
        where: { id: existingInvoice.id },
        data: {
          grossRevenue: new Decimal(grossRevenue),
          royaltyAmount: new Decimal(amounts.royaltyAmount),
          royaltyPercent: new Decimal(config.royaltyPercent),
          brandFundAmount: new Decimal(amounts.brandFundAmount),
          brandFundPercent: new Decimal(config.brandFundPercent),
          systemsFeeAmount: new Decimal(amounts.systemsFeeAmount),
          systemsFeePercent: new Decimal(config.systemsFeePercent),
          totalAmount: new Decimal(amounts.totalAmount),
        },
      });

      return { success: true, invoice: updatedInvoice };
    }

    return {
      success: false,
      error: `Invoice already exists with status: ${existingInvoice.status}`,
    };
  }

  // Generate unique invoice number
  const existingInvoicesThisMonth = await db.royaltyInvoice.count({
    where: { year, month },
  });
  const invoiceNumber = generateInvoiceNumber(
    year,
    month,
    existingInvoicesThisMonth + 1
  );

  // Calculate due date (15th of following month)
  const dueDate = new Date(year, month, 15); // Month is 0-indexed, so month = next month

  // Create new invoice
  const invoice = await db.royaltyInvoice.create({
    data: {
      invoiceNumber,
      franchiseeAccountId,
      year,
      month,
      grossRevenue: new Decimal(grossRevenue),
      royaltyAmount: new Decimal(amounts.royaltyAmount),
      royaltyPercent: new Decimal(config.royaltyPercent),
      brandFundAmount: new Decimal(amounts.brandFundAmount),
      brandFundPercent: new Decimal(config.brandFundPercent),
      systemsFeeAmount: new Decimal(amounts.systemsFeeAmount),
      systemsFeePercent: new Decimal(config.systemsFeePercent),
      totalAmount: new Decimal(amounts.totalAmount),
      status: 'DRAFT',
      invoiceDate: new Date(),
      dueDate,
    },
  });

  // Create ledger entry
  await createLedgerEntry(
    franchiseeAccountId,
    'INVOICE_CREATED',
    amounts.totalAmount,
    `Invoice ${invoiceNumber} for ${month}/${year}`,
    'invoice',
    invoice.id
  );

  return { success: true, invoice };
}

// Generate invoices for all franchisees
export async function generateAllInvoices(
  year: number,
  month: number
): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ franchiseeId: string; error: string }>;
}> {
  const results = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{ franchiseeId: string; error: string }>,
  };

  // Get all franchisee accounts that have revenue data for this month
  // This includes TC-connected franchisees AND Acme-territory franchisees (Westside/Eastside)
  const accountsWithSnapshots = await db.tutorCruncherSnapshot.findMany({
    where: { year, month },
    select: { franchiseeAccountId: true },
  });

  const accountIds = [...new Set(accountsWithSnapshots.map((s) => s.franchiseeAccountId))];

  if (accountIds.length === 0) {
    console.log('[Invoice Generation] No franchisees with revenue data for this period');
    return results;
  }

  const accounts = await db.franchiseeAccount.findMany({
    where: {
      id: { in: accountIds },
    },
    include: {
      prospect: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  console.log(`[Invoice Generation] Found ${accounts.length} franchisees with revenue data`);

  for (const account of accounts) {
    console.log(`[Invoice Generation] Generating invoice for ${account.prospect.firstName} ${account.prospect.lastName}`);
    const result = await generateInvoiceForFranchisee(
      account.id,
      year,
      month
    );

    if (result.success) {
      results.success++;
    } else if (result.error?.includes('No revenue')) {
      results.skipped++;
    } else {
      results.failed++;
      results.errors.push({
        franchiseeId: account.id,
        error: result.error || 'Unknown error',
      });
    }
  }

  return results;
}

// Create ledger entry (immutable audit trail)
async function createLedgerEntry(
  franchiseeAccountId: string,
  entryType:
    | 'INVOICE_CREATED'
    | 'PAYMENT_RECEIVED'
    | 'ADJUSTMENT_CREDIT'
    | 'ADJUSTMENT_DEBIT'
    | 'REFUND',
  amount: number,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<void> {
  // Get current balance
  const lastEntry = await db.ledgerEntry.findFirst({
    where: { franchiseeAccountId },
    orderBy: { createdAt: 'desc' },
  });

  const previousBalance = lastEntry ? Number(lastEntry.balanceAfter) : 0;

  // Calculate new balance based on entry type
  let balanceChange = amount;
  if (
    entryType === 'PAYMENT_RECEIVED' ||
    entryType === 'ADJUSTMENT_CREDIT'
  ) {
    balanceChange = -amount; // Payments reduce balance
  }

  const newBalance = previousBalance + balanceChange;

  await db.ledgerEntry.create({
    data: {
      franchiseeAccountId,
      entryType,
      amount: new Decimal(amount),
      balanceAfter: new Decimal(newBalance),
      description,
      referenceType,
      referenceId,
    },
  });
}

// Update invoice status
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  additionalData?: {
    franchiseeNotes?: string;
    franchiseeApproved?: boolean;
    paidAt?: Date;
    stripePaymentIntentId?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { status };

  if (additionalData?.franchiseeNotes !== undefined) {
    updateData.franchiseeNotes = additionalData.franchiseeNotes;
  }
  if (additionalData?.franchiseeApproved !== undefined) {
    updateData.franchiseeApproved = additionalData.franchiseeApproved;
    updateData.franchiseeReviewedAt = new Date();
  }
  if (additionalData?.paidAt) {
    updateData.paidAt = additionalData.paidAt;
  }
  if (additionalData?.stripePaymentIntentId) {
    updateData.stripePaymentIntentId = additionalData.stripePaymentIntentId;
  }

  // Handle status-specific updates
  if (status === 'PENDING_REVIEW') {
    updateData.sentToFranchiseeAt = new Date();
  }

  await db.royaltyInvoice.update({
    where: { id: invoiceId },
    data: updateData,
  });
}

// Record a payment for an invoice
export async function recordPayment(
  invoiceId: string,
  amount: number,
  method:
    | 'STRIPE_CONNECT'
    | 'STRIPE_ACH'
    | 'ACH_DIRECT'
    | 'CHECK'
    | 'WIRE'
    | 'MANUAL',
  options?: {
    stripePaymentIntentId?: string;
    stripeTransferId?: string;
    stripeChargeId?: string;
    notes?: string;
  }
): Promise<void> {
  const invoice = await db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
  });

  if (!invoice) {
    throw new Error(`Invoice not found: ${invoiceId}`);
  }

  // Create payment record
  const payment = await db.royaltyPayment.create({
    data: {
      invoiceId,
      franchiseeAccountId: invoice.franchiseeAccountId,
      amount: new Decimal(amount),
      method,
      status: 'SUCCEEDED',
      processedAt: new Date(),
      stripePaymentIntentId: options?.stripePaymentIntentId,
      stripeTransferId: options?.stripeTransferId,
      stripeChargeId: options?.stripeChargeId,
      notes: options?.notes,
    },
  });

  // Create ledger entry
  await createLedgerEntry(
    invoice.franchiseeAccountId,
    'PAYMENT_RECEIVED',
    amount,
    `Payment for invoice ${invoice.invoiceNumber}`,
    'payment',
    payment.id
  );

  // Update invoice status
  const totalPaid = await db.royaltyPayment.aggregate({
    where: { invoiceId, status: 'SUCCEEDED' },
    _sum: { amount: true },
  });

  const paidAmount = Number(totalPaid._sum.amount || 0);
  const invoiceAmount = Number(invoice.totalAmount);

  if (paidAmount >= invoiceAmount) {
    await updateInvoiceStatus(invoiceId, 'PAID', { paidAt: new Date() });
  }
}

// Get invoice with full details
export async function getInvoiceWithDetails(invoiceId: string) {
  return db.royaltyInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      franchiseeAccount: {
        include: {
          prospect: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// Get franchisee's outstanding balance
export async function getOutstandingBalance(
  franchiseeAccountId: string
): Promise<number> {
  const lastEntry = await db.ledgerEntry.findFirst({
    where: { franchiseeAccountId },
    orderBy: { createdAt: 'desc' },
  });

  return lastEntry ? Number(lastEntry.balanceAfter) : 0;
}

// Get month name
export function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || '';
}
