import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// GET /api/admin/royalties/invoices - List all invoices with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const status = searchParams.get('status') || undefined;
    const franchiseeAccountId = searchParams.get('franchiseeAccountId') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, unknown> = {};
    if (year) where.year = year;
    if (month) where.month = month;
    if (status) where.status = status;
    if (franchiseeAccountId) where.franchiseeAccountId = franchiseeAccountId;

    // Get invoices
    const [invoices, total] = await Promise.all([
      db.royaltyInvoice.findMany({
        where,
        include: {
          franchiseeAccount: {
            include: {
              prospect: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  preferredTerritory: true,
                },
              },
            },
          },
          payments: {
            where: { status: 'SUCCEEDED' },
            select: {
              amount: true,
              method: true,
              processedAt: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.royaltyInvoice.count({ where }),
    ]);

    return NextResponse.json({
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        franchiseeId: i.franchiseeAccountId,
        franchiseeName: `${i.franchiseeAccount.prospect.firstName} ${i.franchiseeAccount.prospect.lastName}`,
        franchiseeEmail: i.franchiseeAccount.prospect.email,
        territory: i.franchiseeAccount.prospect.preferredTerritory,
        year: i.year,
        month: i.month,
        grossRevenue: Number(i.grossRevenue),
        royaltyAmount: Number(i.royaltyAmount),
        royaltyPercent: Number(i.royaltyPercent),
        brandFundAmount: Number(i.brandFundAmount),
        brandFundPercent: Number(i.brandFundPercent),
        systemsFeeAmount: Number(i.systemsFeeAmount),
        systemsFeePercent: Number(i.systemsFeePercent),
        totalAmount: Number(i.totalAmount),
        status: i.status,
        invoiceDate: i.invoiceDate,
        dueDate: i.dueDate,
        paidAt: i.paidAt,
        sentToFranchiseeAt: i.sentToFranchiseeAt,
        franchiseeReviewedAt: i.franchiseeReviewedAt,
        franchiseeApproved: i.franchiseeApproved,
        franchiseeNotes: i.franchiseeNotes,
        payments: i.payments.map((p) => ({
          amount: Number(p.amount),
          method: p.method,
          processedAt: p.processedAt,
        })),
        totalPaid: i.payments.reduce((sum, p) => sum + Number(p.amount), 0),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
