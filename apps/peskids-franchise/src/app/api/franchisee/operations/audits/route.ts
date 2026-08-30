import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/operations/audits - List own audits only
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
        { error: 'Not a franchisee' },
        { status: 403 }
      );
    }

    const audits = await db.fieldAudit.findMany({
      where: { prospectId: prospect.id },
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        _count: {
          select: {
            responses: true,
            correctiveActions: true,
          },
        },
      },
    });

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        template: a.template,
        auditorName: a.auditorName,
        status: a.status,
        scheduledDate: a.scheduledDate,
        completedAt: a.completedAt,
        overallScore: a.overallScore,
        notes: a.notes,
        responseCount: a._count.responses,
        correctiveActionCount: a._count.correctiveActions,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching franchisee audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}
