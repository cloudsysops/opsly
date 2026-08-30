import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/manual/acknowledgments - Acknowledgment matrix
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all published pages that require acknowledgment
    const pages = await db.manualPage.findMany({
      where: {
        status: 'PUBLISHED',
        requiresAcknowledgment: true,
      },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
          },
        },
        acknowledgments: true,
      },
      orderBy: [{ section: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    // Get all SELECTED prospects (franchisees)
    const franchisees = await db.prospect.findMany({
      where: { pipelineStage: 'SELECTED' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        preferredTerritory: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    // Build acknowledgment matrix
    let totalRequired = 0;
    let totalAcknowledged = 0;
    let totalOutdated = 0;

    const franchiseeStatuses = franchisees.map((f) => {
      const pageStatuses = pages.map((page) => {
        totalRequired++;

        const ack = page.acknowledgments.find((a) => a.prospectId === f.id);

        if (!ack) {
          return {
            pageId: page.id,
            acknowledged: false,
            outdated: false,
            acknowledgedAt: null,
            acknowledgedVersion: null,
          };
        }

        const isCurrentVersion = ack.versionNumber >= page.currentVersion;

        if (isCurrentVersion) {
          totalAcknowledged++;
        } else {
          totalOutdated++;
        }

        return {
          pageId: page.id,
          acknowledged: isCurrentVersion,
          outdated: !isCurrentVersion,
          acknowledgedAt: ack.acknowledgedAt,
          acknowledgedVersion: ack.versionNumber,
        };
      });

      return {
        id: f.id,
        firstName: f.firstName,
        lastName: f.lastName,
        email: f.email,
        territory: f.preferredTerritory,
        pages: pageStatuses,
      };
    });

    const completionRate =
      totalRequired > 0
        ? Math.round((totalAcknowledged / totalRequired) * 100)
        : 0;

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        currentVersion: p.currentVersion,
        section: p.section,
      })),
      franchisees: franchiseeStatuses,
      stats: {
        totalRequired,
        totalAcknowledged,
        totalOutdated,
        completionRate,
      },
    });
  } catch (error) {
    console.error('Error fetching acknowledgment matrix:', error);
    return NextResponse.json(
      { error: 'Failed to fetch acknowledgment data' },
      { status: 500 }
    );
  }
}
