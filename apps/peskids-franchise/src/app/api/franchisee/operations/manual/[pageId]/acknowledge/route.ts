import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/franchisee/operations/manual/[pageId]/acknowledge - Acknowledge a manual page
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the prospect for this user
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

    const { pageId } = await params;

    // Validate the page exists, is published, and requires acknowledgment
    const page = await db.manualPage.findUnique({
      where: { id: pageId },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (page.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Page is not published' },
        { status: 400 }
      );
    }

    if (!page.requiresAcknowledgment) {
      return NextResponse.json(
        { error: 'This page does not require acknowledgment' },
        { status: 400 }
      );
    }

    // Upsert acknowledgment (update if already exists, create if not)
    const acknowledgment = await db.manualAcknowledgment.upsert({
      where: {
        prospectId_pageId: {
          prospectId: prospect.id,
          pageId,
        },
      },
      update: {
        versionNumber: page.currentVersion,
        acknowledgedAt: new Date(),
      },
      create: {
        prospectId: prospect.id,
        pageId,
        versionNumber: page.currentVersion,
      },
    });

    return NextResponse.json({
      success: true,
      acknowledgment: {
        id: acknowledgment.id,
        pageId: acknowledgment.pageId,
        versionNumber: acknowledgment.versionNumber,
        acknowledgedAt: acknowledgment.acknowledgedAt,
      },
    });
  } catch (error) {
    console.error('Error acknowledging manual page:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge page' },
      { status: 500 }
    );
  }
}
