import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/messages - Get all messages for the franchisee
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect || prospect.pipelineStage !== 'SELECTED') {
      return NextResponse.json({ error: 'Not a franchisee' }, { status: 403 });
    }

    // Fetch emails
    const emails = await db.sentEmail.findMany({
      where: { prospectId: prospect.id },
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        subject: true,
        bodyHtml: true,
        bodyPreview: true,
        sentBy: true,
        sentAt: true,
      },
    });

    // Fetch published, non-expired announcements
    const now = new Date();
    const announcements = await db.announcement.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        reads: {
          where: { prospectId: prospect.id },
          select: { readAt: true },
        },
      },
    });

    // Map announcements with read status
    const announcementsWithReadStatus = announcements.map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.category,
      priority: a.priority,
      isPinned: a.isPinned,
      publishedAt: a.publishedAt?.toISOString() || a.createdAt.toISOString(),
      createdBy: a.createdBy,
      isRead: a.reads.length > 0,
      readAt: a.reads.length > 0 ? a.reads[0].readAt.toISOString() : null,
    }));

    // Count unread announcements
    const unreadCount = announcementsWithReadStatus.filter((a: any) => !a.isRead).length;

    return NextResponse.json({
      emails: emails.map((e: any) => ({
        ...e,
        sentAt: e.sentAt.toISOString(),
      })),
      announcements: announcementsWithReadStatus,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
