import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/franchisee/operations/audits/[id]/corrective-actions/[actionId] - Mark corrective action complete
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; actionId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, actionId } = await params;

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

    // Verify the audit belongs to this franchisee
    const audit = await db.fieldAudit.findFirst({
      where: {
        id,
        prospectId: prospect.id,
      },
    });

    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    // Verify the corrective action belongs to this audit
    const correctiveAction = await db.correctiveAction.findFirst({
      where: {
        id: actionId,
        auditId: id,
      },
    });

    if (!correctiveAction) {
      return NextResponse.json(
        { error: 'Corrective action not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { evidence } = body;

    const updated = await db.correctiveAction.update({
      where: { id: actionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: session.user.email,
        evidence: evidence || null,
      },
    });

    return NextResponse.json({
      correctiveAction: {
        id: updated.id,
        auditId: updated.auditId,
        description: updated.description,
        assignedTo: updated.assignedTo,
        dueDate: updated.dueDate,
        status: updated.status,
        completedAt: updated.completedAt,
        completedBy: updated.completedBy,
        evidence: updated.evidence,
        adminNotes: updated.adminNotes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error completing corrective action:', error);
    return NextResponse.json(
      { error: 'Failed to complete corrective action' },
      { status: 500 }
    );
  }
}
