import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/franchisee/operations/tickets/[id]/comments - Add franchisee comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Verify ticket exists and belongs to this franchisee
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.prospectId !== prospect.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const comment = await db.supportTicketComment.create({
      data: {
        ticketId: id,
        authorEmail: prospect.email,
        authorName: `${prospect.firstName} ${prospect.lastName}`,
        authorRole: 'FRANCHISEE',
        content: content.trim(),
        isInternal: false,
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        authorEmail: comment.authorEmail,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        content: comment.content,
        isInternal: comment.isInternal,
        createdAt: comment.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding franchisee ticket comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
