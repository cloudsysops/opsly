import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/tickets - List all tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const assignedTo = searchParams.get('assignedTo');

    // Build where clause from filters
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedTo) where.assignedTo = assignedTo;

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const allTickets = await db.supportTicket.findMany({
      select: {
        status: true,
        slaDeadline: true,
        resolvedAt: true,
      },
    });

    const open = allTickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = allTickets.filter(
      (t) =>
        t.status === 'IN_PROGRESS' ||
        t.status === 'WAITING_ON_FRANCHISEE' ||
        t.status === 'WAITING_ON_ADMIN'
    ).length;
    const resolvedToday = allTickets.filter(
      (t) => t.resolvedAt && t.resolvedAt >= todayStart
    ).length;
    const overdueSla = allTickets.filter(
      (t) =>
        t.slaDeadline &&
        t.slaDeadline < now &&
        t.status !== 'RESOLVED' &&
        t.status !== 'CLOSED'
    ).length;

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo,
        assignedAt: t.assignedAt,
        resolvedAt: t.resolvedAt,
        resolvedBy: t.resolvedBy,
        resolution: t.resolution,
        firstResponseAt: t.firstResponseAt,
        slaDeadline: t.slaDeadline,
        prospect: t.prospect,
        commentCount: t._count.comments,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      stats: {
        open,
        inProgress,
        resolvedToday,
        overdueSla,
      },
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}
