import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateInvoiceStatus, recordPayment, getInvoiceWithDetails } from '@/lib/royalties';
import { sendInvoiceForReview, sendPaymentConfirmation } from '@/lib/royalties/notifications';
import type { InvoiceStatus } from '@prisma/client';

export const dynamic = "force-dynamic";

// GET /api/admin/royalties/invoices/[id] - Get invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await getInvoiceWithDetails(id);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get TC snapshot for context
    const snapshot = await db.tutorCruncherSnapshot.findUnique({
      where: {
        franchiseeAccountId_year_month: {
          franchiseeAccountId: invoice.franchiseeAccountId,
          year: invoice.year,
          month: invoice.month,
        },
      },
    });

    // Get ledger entries
    const ledgerEntries = await db.ledgerEntry.findMany({
      where: {
        franchiseeAccountId: invoice.franchiseeAccountId,
        referenceId: id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        franchiseeId: invoice.franchiseeAccountId,
        franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
        franchiseeEmail: invoice.franchiseeAccount.prospect.email,
        franchiseePhone: invoice.franchiseeAccount.prospect.phone,
        year: invoice.year,
        month: invoice.month,
        grossRevenue: Number(invoice.grossRevenue),
        royaltyAmount: Number(invoice.royaltyAmount),
        royaltyPercent: Number(invoice.royaltyPercent),
        brandFundAmount: Number(invoice.brandFundAmount),
        brandFundPercent: Number(invoice.brandFundPercent),
        systemsFeeAmount: Number(invoice.systemsFeeAmount),
        systemsFeePercent: Number(invoice.systemsFeePercent),
        adjustmentAmount: invoice.adjustmentAmount ? Number(invoice.adjustmentAmount) : null,
        adjustmentReason: invoice.adjustmentReason,
        totalAmount: Number(invoice.totalAmount),
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        sentToFranchiseeAt: invoice.sentToFranchiseeAt,
        franchiseeReviewedAt: invoice.franchiseeReviewedAt,
        franchiseeApproved: invoice.franchiseeApproved,
        franchiseeNotes: invoice.franchiseeNotes,
        stripePaymentIntentId: invoice.stripePaymentIntentId,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        processedAt: p.processedAt,
        failureReason: p.failureReason,
        notes: p.notes,
        stripePaymentIntentId: p.stripePaymentIntentId,
        createdAt: p.createdAt,
      })),
      snapshot: snapshot
        ? {
            grossRevenue: Number(snapshot.grossRevenue),
            homeRevenue: snapshot.homeRevenue ? Number(snapshot.homeRevenue) : null,
            onlineRevenue: snapshot.onlineRevenue ? Number(snapshot.onlineRevenue) : null,
            retailRevenue: snapshot.retailRevenue ? Number(snapshot.retailRevenue) : null,
            schoolRevenue: snapshot.schoolRevenue ? Number(snapshot.schoolRevenue) : null,
            otherRevenue: snapshot.otherRevenue ? Number(snapshot.otherRevenue) : null,
            totalLessons: snapshot.totalLessons,
            totalHours: snapshot.totalHours ? Number(snapshot.totalHours) : null,
            activeStudents: snapshot.activeStudents,
            activeTutors: snapshot.activeTutors,
            syncedAt: snapshot.createdAt,
          }
        : null,
      ledgerEntries: ledgerEntries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        amount: Number(e.amount),
        balanceAfter: Number(e.balanceAfter),
        description: e.description,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/royalties/invoices/[id] - Update invoice
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const invoice = await getInvoiceWithDetails(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    switch (action) {
      case 'send':
        // Send invoice to franchisee
        await updateInvoiceStatus(id, 'PENDING_REVIEW');

        // Send email notification with optional customizations
        const { customSubject, personalNote } = data;
        await sendInvoiceForReview({
          franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
          franchiseeEmail: invoice.franchiseeAccount.prospect.email,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: id,
          year: invoice.year,
          month: invoice.month,
          grossRevenue: Number(invoice.grossRevenue),
          totalAmount: Number(invoice.totalAmount),
          dueDate: invoice.dueDate,
          customSubject,
          personalNote,
        });

        return NextResponse.json({
          success: true,
          message: 'Invoice sent to franchisee',
        });

      case 'approve':
        // Admin approves disputed invoice
        await updateInvoiceStatus(id, 'APPROVED', {
          franchiseeApproved: true,
        });
        return NextResponse.json({
          success: true,
          message: 'Invoice approved',
        });

      case 'mark_payment_pending':
        await updateInvoiceStatus(id, 'PAYMENT_PENDING');
        return NextResponse.json({
          success: true,
          message: 'Invoice marked as payment pending',
        });

      case 'record_payment':
        // Record manual payment
        const { amount, method, notes } = data;
        await recordPayment(id, amount, method, { notes });

        // Send confirmation
        await sendPaymentConfirmation({
          franchiseeName: `${invoice.franchiseeAccount.prospect.firstName} ${invoice.franchiseeAccount.prospect.lastName}`,
          franchiseeEmail: invoice.franchiseeAccount.prospect.email,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: id,
          year: invoice.year,
          month: invoice.month,
          grossRevenue: Number(invoice.grossRevenue),
          totalAmount: Number(invoice.totalAmount),
          dueDate: invoice.dueDate,
          paidAmount: amount,
          paidAt: new Date(),
        });

        return NextResponse.json({
          success: true,
          message: 'Payment recorded',
        });

      case 'cancel':
        await updateInvoiceStatus(id, 'CANCELLED');
        return NextResponse.json({
          success: true,
          message: 'Invoice cancelled',
        });

      case 'update_status':
        const { status } = data;
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required' },
            { status: 400 }
          );
        }
        await updateInvoiceStatus(id, status as InvoiceStatus);
        return NextResponse.json({
          success: true,
          message: `Invoice status updated to ${status}`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/royalties/invoices/[id] - Permanently delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the invoice first
    const invoice = await db.royaltyInvoice.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow deletion of DRAFT, PENDING_REVIEW, or CANCELLED invoices
    const deletableStatuses = ['DRAFT', 'PENDING_REVIEW', 'CANCELLED'];
    if (!deletableStatuses.includes(invoice.status)) {
      return NextResponse.json(
        {
          error: `Cannot delete invoice with status "${invoice.status}". Only DRAFT, PENDING_REVIEW, or CANCELLED invoices can be deleted.`,
        },
        { status: 400 }
      );
    }

    // Don't allow deletion if there are successful payments
    const hasPayments = invoice.payments.some((p) => p.status === 'SUCCEEDED');
    if (hasPayments) {
      return NextResponse.json(
        { error: 'Cannot delete invoice with successful payments' },
        { status: 400 }
      );
    }

    // Delete related records first (in order)
    // 1. Delete any payments (should only be failed ones at this point)
    await db.royaltyPayment.deleteMany({
      where: { invoiceId: id },
    });

    // 2. Delete any ledger entries referencing this invoice
    await db.ledgerEntry.deleteMany({
      where: { referenceId: id },
    });

    // 3. Delete the invoice
    await db.royaltyInvoice.delete({
      where: { id },
    });

    console.log(`[Invoice Delete] Invoice ${invoice.invoiceNumber} deleted by ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} has been permanently deleted`,
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
