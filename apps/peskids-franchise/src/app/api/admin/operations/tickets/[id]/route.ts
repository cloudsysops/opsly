import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/tickets/[id] - Single ticket with all comments and prospect info
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

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            preferredTerritory: true,
            pipelineStage: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        assignedAt: ticket.assignedAt,
        resolvedAt: ticket.resolvedAt,
        resolvedBy: ticket.resolvedBy,
        resolution: ticket.resolution,
        firstResponseAt: ticket.firstResponseAt,
        slaDeadline: ticket.slaDeadline,
        prospect: ticket.prospect,
        comments: ticket.comments.map((c) => ({
          id: c.id,
          authorEmail: c.authorEmail,
          authorName: c.authorName,
          authorRole: c.authorRole,
          content: c.content,
          isInternal: c.isInternal,
          createdAt: c.createdAt,
        })),
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/operations/tickets/[id] - Update ticket
export async function PUT(
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
    const { status, priority, assignedTo, resolution } = body;

    const existing = await db.supportTicket.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (priority !== undefined) updateData.priority = priority;
    if (resolution !== undefined) updateData.resolution = resolution;

    // Handle assignment change
    if (assignedTo !== undefined && assignedTo !== existing.assignedTo) {
      updateData.assignedTo = assignedTo;
      updateData.assignedAt = new Date();
    }

    // Handle status change
    if (status !== undefined && status !== existing.status) {
      updateData.status = status;

      // If moving to IN_PROGRESS and no first response yet, set it
      if (status === 'IN_PROGRESS' && !existing.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      // If resolving, set resolvedAt and resolvedBy
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = session.user.email;
      }
    }

    const ticket = await db.supportTicket.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.assignedTo,
        assignedAt: ticket.assignedAt,
        resolvedAt: ticket.resolvedAt,
        resolvedBy: ticket.resolvedBy,
        resolution: ticket.resolution,
        firstResponseAt: ticket.firstResponseAt,
        slaDeadline: ticket.slaDeadline,
        prospect: ticket.prospect,
        commentCount: ticket._count.comments,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
