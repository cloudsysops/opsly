import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/audits - List all audits with filters and stats
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const templateId = searchParams.get('templateId');
    const prospectId = searchParams.get('prospectId');

    // Build where clause from filters
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (templateId) where.templateId = templateId;
    if (prospectId) where.prospectId = prospectId;

    const audits = await db.fieldAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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

    // Calculate stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allAudits = await db.fieldAudit.findMany({
      select: {
        status: true,
        completedAt: true,
        overallScore: true,
      },
    });

    const scheduled = allAudits.filter((a) => a.status === 'SCHEDULED').length;

    const completedThisMonth = allAudits.filter(
      (a) =>
        a.status === 'COMPLETED' &&
        a.completedAt &&
        a.completedAt >= monthStart
    ).length;

    const completedAudits = allAudits.filter(
      (a) => a.status === 'COMPLETED' && a.overallScore !== null
    );
    const averageScore =
      completedAudits.length > 0
        ? completedAudits.reduce((sum, a) => sum + (a.overallScore || 0), 0) /
          completedAudits.length
        : 0;

    const openCorrectiveActions = await db.correctiveAction.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'OVERDUE'] },
      },
    });

    return NextResponse.json({
      audits: audits.map((a) => ({
        id: a.id,
        templateId: a.templateId,
        template: a.template,
        prospectId: a.prospectId,
        prospect: a.prospect,
        auditorEmail: a.auditorEmail,
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
      stats: {
        scheduled,
        completedThisMonth,
        averageScore: Math.round(averageScore * 10) / 10,
        openCorrectiveActions,
      },
    });
  } catch (error) {
    console.error('Error fetching audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}

// POST /api/admin/operations/audits - Create/schedule an audit
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateId,
      prospectId,
      auditorEmail,
      auditorName,
      scheduledDate,
      notes,
    } = body;

    if (!templateId || !prospectId) {
      return NextResponse.json(
        { error: 'Template ID and prospect ID are required' },
        { status: 400 }
      );
    }

    // Verify template exists
    const template = await db.auditTemplate.findUnique({
      where: { id: templateId },
    });
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
    });
    if (!prospect) {
      return NextResponse.json(
        { error: 'Prospect not found' },
        { status: 404 }
      );
    }

    // Determine status based on scheduled date
    const now = new Date();
    const parsedDate = scheduledDate ? new Date(scheduledDate) : null;
    const status =
      parsedDate && parsedDate > now ? 'SCHEDULED' : 'IN_PROGRESS';

    const audit = await db.fieldAudit.create({
      data: {
        templateId,
        prospectId,
        auditorEmail: auditorEmail || session.user.email,
        auditorName:
          auditorName || session.user.name || session.user.email,
        status,
        scheduledDate: parsedDate,
        notes: notes || null,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ audit }, { status: 201 });
  } catch (error) {
    console.error('Error creating audit:', error);
    return NextResponse.json(
      { error: 'Failed to create audit' },
      { status: 500 }
    );
  }
}
