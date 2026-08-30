import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/operations/audits/[id] - Single audit detail for franchisee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Find audit and verify ownership
    const audit = await db.fieldAudit.findFirst({
      where: {
        id,
        prospectId: prospect.id,
      },
      include: {
        template: {
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
            },
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
        template: {
          id: audit.template.id,
          name: audit.template.name,
          slug: audit.template.slug,
          description: audit.template.description,
          category: audit.template.category,
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
    console.error('Error fetching franchisee audit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    );
  }
}
