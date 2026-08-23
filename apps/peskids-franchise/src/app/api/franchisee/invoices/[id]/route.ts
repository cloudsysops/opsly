import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { updateInvoiceStatus, getMonthName } from '@/lib/royalties';
import { sendDisputeNotification, sendPaymentDueNotification } from '@/lib/royalties/notifications';

export const dynamic = "force-dynamic";

// GET /api/franchisee/invoices/[id] - Get invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the prospect for this user
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    // Get invoice and verify ownership
    const invoice = await db.royaltyInvoice.findFirst({
      where: {
        id,
        franchiseeAccountId: prospect.franchiseeAccount.id,
      },
      include: {
        payments: {
          where: { status: 'SUCCEEDED' },
          select: {
            id: true,
            amount: true,
            method: true,
            processedAt: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get TC snapshot for breakdown
    const snapshot = await db.tutorCruncherSnapshot.findUnique({
      where: {
        franchiseeAccountId_year_month: {
          franchiseeAccountId: prospect.franchiseeAccount.id,
          year: invoice.year,
          month: invoice.month,
        },
      },
    });

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        year: invoice.year,
        month: invoice.month,
        monthName: getMonthName(invoice.month),
        grossRevenue: Number(invoice.grossRevenue),
        royaltyAmount: Number(invoice.royaltyAmount),
        royaltyPercent: Number(invoice.royaltyPercent),
        brandFundAmount: Number(invoice.brandFundAmount),
        brandFundPercent: Number(invoice.brandFundPercent),
        systemsFeeAmount: Number(invoice.systemsFeeAmount),
        systemsFeePercent: Number(invoice.systemsFeePercent),
        totalAmount: Number(invoice.totalAmount),
        status: invoice.status,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        franchiseeApproved: invoice.franchiseeApproved,
        franchiseeNotes: invoice.franchiseeNotes,
      },
      revenueBreakdown: snapshot
        ? {
            home: snapshot.homeRevenue ? Number(snapshot.homeRevenue) : 0,
            online: snapshot.onlineRevenue ? Number(snapshot.onlineRevenue) : 0,
            retail: snapshot.retailRevenue ? Number(snapshot.retailRevenue) : 0,
            school: snapshot.schoolRevenue ? Number(snapshot.schoolRevenue) : 0,
            other: snapshot.otherRevenue ? Number(snapshot.otherRevenue) : 0,
            total: Number(snapshot.grossRevenue),
            totalLessons: snapshot.totalLessons,
            totalHours: snapshot.totalHours ? Number(snapshot.totalHours) : 0,
            activeStudents: snapshot.activeStudents,
            activeTutors: snapshot.activeTutors,
          }
        : null,
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        processedAt: p.processedAt,
      })),
      totalPaid: invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// POST /api/franchisee/invoices/[id] - Approve or dispute invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    // Get the prospect for this user
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    // Get invoice and verify ownership
    const invoice = await db.royaltyInvoice.findFirst({
      where: {
        id,
        franchiseeAccountId: prospect.franchiseeAccount.id,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only allow action on pending review invoices
    if (invoice.status !== 'PENDING_REVIEW') {
      return NextResponse.json(
        { error: `Cannot ${action} invoice with status: ${invoice.status}` },
        { status: 400 }
      );
    }

    switch (action) {
      case 'approve':
        // First approve the invoice
        await updateInvoiceStatus(id, 'APPROVED', {
          franchiseeApproved: true,
          franchiseeNotes: notes || null,
        });

        // Then immediately move to PAYMENT_PENDING
        await updateInvoiceStatus(id, 'PAYMENT_PENDING');

        // Send payment due notification
        sendPaymentDueNotification({
          franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
          franchiseeEmail: prospect.email,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: id,
          year: invoice.year,
          month: invoice.month,
          grossRevenue: Number(invoice.grossRevenue),
          totalAmount: Number(invoice.totalAmount),
          dueDate: invoice.dueDate,
        }).catch(console.error); // Fire and forget

        return NextResponse.json({
          success: true,
          message: 'Invoice approved! Please proceed to payment.',
        });

      case 'dispute':
        if (!notes?.trim()) {
          return NextResponse.json(
            { error: 'Please provide details about your dispute' },
            { status: 400 }
          );
        }

        await updateInvoiceStatus(id, 'DISPUTED', {
          franchiseeApproved: false,
          franchiseeNotes: notes,
        });

        // Notify admins about the dispute
        await sendDisputeNotification({
          franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
          franchiseeEmail: prospect.email,
          invoiceNumber: invoice.invoiceNumber,
          invoiceId: id,
          year: invoice.year,
          month: invoice.month,
          grossRevenue: Number(invoice.grossRevenue),
          totalAmount: Number(invoice.totalAmount),
          dueDate: invoice.dueDate,
          disputeNotes: notes,
        });

        return NextResponse.json({
          success: true,
          message: 'Dispute submitted successfully. Our team will review and contact you.',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: approve or dispute' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing invoice action:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
