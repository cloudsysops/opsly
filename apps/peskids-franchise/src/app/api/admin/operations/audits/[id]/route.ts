import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/audits/[id] - Single audit with full details
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

    const audit = await db.fieldAudit.findUnique({
      where: { id },
      include: {
        template: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
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
        responses: {
          include: {
            item: true,
          },
        },
        correctiveActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    return NextResponse.json({
      audit: {
        id: audit.id,
        templateId: audit.templateId,
        template: {
          id: audit.template.id,
          name: audit.template.name,
          slug: audit.template.slug,
          description: audit.template.description,
          category: audit.template.category,
          isActive: audit.template.isActive,
          items: audit.template.items.map((item) => ({
            id: item.id,
            question: item.question,
            description: item.description,
            itemType: item.itemType,
            weight: item.weight,
            sortOrder: item.sortOrder,
            isRequired: item.isRequired,
          })),
        },
        prospectId: audit.prospectId,
        prospect: audit.prospect,
        auditorEmail: audit.auditorEmail,
        auditorName: audit.auditorName,
        status: audit.status,
        scheduledDate: audit.scheduledDate,
        completedAt: audit.completedAt,
        overallScore: audit.overallScore,
        notes: audit.notes,
        responses: audit.responses.map((r) => ({
          id: r.id,
          itemId: r.itemId,
          item: {
            id: r.item.id,
            question: r.item.question,
            itemType: r.item.itemType,
            weight: r.item.weight,
          },
          value: r.value,
          score: r.score,
          notes: r.notes,
          photoUrl: r.photoUrl,
        })),
        correctiveActions: audit.correctiveActions.map((ca) => ({
          id: ca.id,
          description: ca.description,
          assignedTo: ca.assignedTo,
          dueDate: ca.dueDate,
          status: ca.status,
          completedAt: ca.completedAt,
          completedBy: ca.completedBy,
          evidence: ca.evidence,
          adminNotes: ca.adminNotes,
          createdAt: ca.createdAt,
          updatedAt: ca.updatedAt,
        })),
        createdAt: audit.createdAt,
        updatedAt: audit.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching audit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/operations/audits/[id] - Update audit status/notes
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
    const { status, notes } = body;

    const existing = await db.fieldAudit.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (notes !== undefined) updateData.notes = notes;

    if (status !== undefined && status !== existing.status) {
      updateData.status = status;

      // Set completedAt when marking as COMPLETED
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const audit = await db.fieldAudit.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      audit: {
        id: audit.id,
        templateId: audit.templateId,
        template: audit.template,
        prospectId: audit.prospectId,
        prospect: audit.prospect,
        auditorEmail: audit.auditorEmail,
        auditorName: audit.auditorName,
        status: audit.status,
        scheduledDate: audit.scheduledDate,
        completedAt: audit.completedAt,
        overallScore: audit.overallScore,
        notes: audit.notes,
        responseCount: audit._count.responses,
        correctiveActionCount: audit._count.correctiveActions,
        createdAt: audit.createdAt,
        updatedAt: audit.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating audit:', error);
    return NextResponse.json(
      { error: 'Failed to update audit' },
      { status: 500 }
    );
  }
}
