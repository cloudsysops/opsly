import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/operations/manual - Get all published sections and pages for franchisee
export async function GET() {
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

    // Get all published sections with their published pages
    const sections = await db.manualSection.findMany({
      where: {
        pages: {
          some: { status: 'PUBLISHED' },
        },
      },
      include: {
        pages: {
          where: { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            sortOrder: true,
            requiresAcknowledgment: true,
            currentVersion: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Get all acknowledgments for this franchisee
    const acknowledgments = await db.manualAcknowledgment.findMany({
      where: { prospectId: prospect.id },
    });

    // Build a lookup map for quick access
    const ackMap = new Map(
      acknowledgments.map((a) => [a.pageId, a])
    );

    let pendingAcks = 0;

    // Annotate each page with acknowledgment status
    const annotatedSections = sections.map((section) => ({
      id: section.id,
      title: section.title,
      slug: section.slug,
      description: section.description,
      icon: section.icon,
      sortOrder: section.sortOrder,
      pages: section.pages.map((page) => {
        const ack = ackMap.get(page.id);
        const acknowledged = ack
          ? ack.versionNumber >= page.currentVersion
          : false;
        const needsAcknowledgment =
          page.requiresAcknowledgment && !acknowledged;

        if (needsAcknowledgment) {
          pendingAcks++;
        }

        return {
          id: page.id,
          title: page.title,
          slug: page.slug,
          excerpt: page.excerpt,
          orderIndex: page.sortOrder,
          requiresAcknowledgment: page.requiresAcknowledgment,
          currentVersion: page.currentVersion,
          updatedAt: page.updatedAt,
          acknowledged,
          needsAcknowledgment,
        };
      }),
    }));

    // Build ackRecords array for frontend state tracking
    const ackRecords = acknowledgments.map((a) => ({
      pageId: a.pageId,
      acknowledgedAt: a.acknowledgedAt.toISOString(),
      isOutdated: (() => {
        // Find the page to check if ack is outdated
        for (const section of sections) {
          const page = section.pages.find((p) => p.id === a.pageId);
          if (page) {
            return a.versionNumber < page.currentVersion;
          }
        }
        return false;
      })(),
    }));

    return NextResponse.json({
      sections: annotatedSections,
      pendingAcks,
      ackRecords,
    });
  } catch (error) {
    console.error('Error fetching franchisee manual:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operations manual' },
      { status: 500 }
    );
  }
}
