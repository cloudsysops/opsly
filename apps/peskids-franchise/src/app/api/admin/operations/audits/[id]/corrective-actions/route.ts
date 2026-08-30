import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/audits/[id]/corrective-actions - List corrective actions
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

    // Verify audit exists
    const audit = await db.fieldAudit.findUnique({ where: { id } });
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const correctiveActions = await db.correctiveAction.findMany({
      where: { auditId: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      correctiveActions: correctiveActions.map((ca) => ({
        id: ca.id,
        auditId: ca.auditId,
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
    });
  } catch (error) {
    console.error('Error fetching corrective actions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch corrective actions' },
      { status: 500 }
    );
  }
}

// POST /api/admin/operations/audits/[id]/corrective-actions - Create corrective action
export async function POST(
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
    const { description, assignedTo, dueDate, adminNotes } = body;

    if (!description || !assignedTo || !dueDate) {
      return NextResponse.json(
        { error: 'Description, assignedTo, and dueDate are required' },
        { status: 400 }
      );
    }

    // Verify audit exists
    const audit = await db.fieldAudit.findUnique({ where: { id } });
    if (!audit) {
      return NextResponse.json({ error: 'Audit not found' }, { status: 404 });
    }

    const correctiveAction = await db.correctiveAction.create({
      data: {
        auditId: id,
        description,
        assignedTo,
        dueDate: new Date(dueDate),
        adminNotes: adminNotes || null,
      },
    });

    return NextResponse.json({ correctiveAction }, { status: 201 });
  } catch (error) {
    console.error('Error creating corrective action:', error);
    return NextResponse.json(
      { error: 'Failed to create corrective action' },
      { status: 500 }
    );
  }
}
