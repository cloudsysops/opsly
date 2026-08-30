import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/payments/history - Get payment history for franchisee
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    const franchiseeAccountId = prospect.franchiseeAccount.id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');

    // Get all payments for this franchisee
    const payments = await db.royaltyPayment.findMany({
      where: {
        invoice: {
          franchiseeAccountId,
        },
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            year: true,
            month: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { processedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    // Get total count
    const total = await db.royaltyPayment.count({
      where: {
        invoice: {
          franchiseeAccountId,
        },
      },
    });

    // Calculate summary stats
    const allPayments = await db.royaltyPayment.findMany({
      where: {
        invoice: { franchiseeAccountId },
        status: 'SUCCEEDED',
      },
      select: { amount: true, processedAt: true },
    });

    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const thisYear = new Date().getFullYear();
    const thisYearPayments = allPayments.filter(
      (p) => p.processedAt && new Date(p.processedAt).getFullYear() === thisYear
    );
    const thisYearTotal = thisYearPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        processedAt: p.processedAt,
        stripePaymentIntentId: p.stripePaymentIntentId,
        invoice: {
          invoiceNumber: p.invoice.invoiceNumber,
          period: `${MONTHS[p.invoice.month - 1]} ${p.invoice.year}`,
          totalAmount: Number(p.invoice.totalAmount),
        },
      })),
      summary: {
        totalPaid,
        thisYearTotal,
        paymentCount: allPayments.length,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
  }
}
