import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// SLA deadline hours by priority
const SLA_HOURS: Record<string, number> = {
  URGENT: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

// Generate ticket number: TKT-YYYY-XXXXX
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.supportTicket.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  const padded = String(count + 1).padStart(5, '0');
  return `TKT-${year}-${padded}`;
}

// GET /api/franchisee/operations/tickets - List own tickets
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    if (prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Access restricted to selected franchisees' },
        { status: 403 }
      );
    }

    const tickets = await db.supportTicket.findMany({
      where: { prospectId: prospect.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { comments: { where: { isInternal: false } } },
        },
      },
    });

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
        resolvedAt: t.resolvedAt,
        resolution: t.resolution,
        firstResponseAt: t.firstResponseAt,
        slaDeadline: t.slaDeadline,
        commentCount: t._count.comments,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching franchisee tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST /api/franchisee/operations/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    if (prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json(
        { error: 'Access restricted to selected franchisees' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subject, description, category, priority } = body;

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const ticketNumber = await generateTicketNumber();

    // Calculate SLA deadline
    const ticketPriority = priority || 'MEDIUM';
    const slaHours = SLA_HOURS[ticketPriority] || 24;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const ticket = await db.supportTicket.create({
      data: {
        ticketNumber,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority: ticketPriority,
        status: 'OPEN',
        prospectId: prospect.id,
        slaDeadline,
      },
    });

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        slaDeadline: ticket.slaDeadline,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}
