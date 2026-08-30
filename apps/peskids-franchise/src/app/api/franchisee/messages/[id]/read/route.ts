import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/franchisee/messages/[id]/read - Mark an announcement as read
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const announcementId = params.id;

    // Verify announcement exists and is published
    const announcement = await db.announcement.findFirst({
      where: {
        id: announcementId,
        status: 'PUBLISHED',
      },
    });

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Upsert to avoid duplicates (unique constraint on [announcementId, prospectId])
    await db.announcementRead.upsert({
      where: {
        announcementId_prospectId: {
          announcementId,
          prospectId: prospect.id,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        announcementId,
        prospectId: prospect.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
