import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/admin/operations/tickets/[id]/comments - Add admin comment
export async function POST(
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
    const { content, isInternal } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const comment = await db.supportTicketComment.create({
      data: {
        ticketId: id,
        authorEmail: session.user.email,
        authorName: session.user.name || session.user.email,
        authorRole: 'ADMIN',
        content: content.trim(),
        isInternal: isInternal === true,
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
    console.error('Error adding ticket comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
