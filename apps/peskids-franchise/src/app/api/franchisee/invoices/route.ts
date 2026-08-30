import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/franchisee/invoices - Get franchisee's invoices
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the prospect for this user
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: {
        franchiseeAccount: true,
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
    }

    // Check if they are a selected franchisee
    if (prospect.pipelineStage !== 'SELECTED' || !prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: 'Not a franchisee' },
        { status: 403 }
      );
    }

    const franchiseeAccountId = prospect.franchiseeAccount.id;

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { franchiseeAccountId };
    if (year) where.year = year;

    const [invoices, total] = await Promise.all([
      db.royaltyInvoice.findMany({
        where,
        include: {
          payments: {
            where: { status: 'SUCCEEDED' },
            select: {
              amount: true,
              method: true,
              processedAt: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.royaltyInvoice.count({ where }),
    ]);

    // Get outstanding balance
    const lastLedger = await db.ledgerEntry.findFirst({
      where: { franchiseeAccountId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        year: i.year,
        month: i.month,
        grossRevenue: Number(i.grossRevenue),
        totalAmount: Number(i.totalAmount),
        status: i.status,
        invoiceDate: i.invoiceDate,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        franchiseeApproved: i.franchiseeApproved,
        payments: i.payments.map((p) => ({
          amount: Number(p.amount),
          method: p.method,
          processedAt: p.processedAt,
        })),
        totalPaid: i.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      })),
      summary: {
        outstandingBalance: lastLedger ? Number(lastLedger.balanceAfter) : 0,
        totalInvoices: total,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching franchisee invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
