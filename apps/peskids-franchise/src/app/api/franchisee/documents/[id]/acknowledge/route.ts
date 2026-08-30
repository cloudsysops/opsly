import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// POST /api/franchisee/documents/[id]/acknowledge - Franchisee acknowledges a document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect?.franchiseeAccount) {
      return NextResponse.json({ error: 'No franchisee account' }, { status: 403 });
    }

    const { id } = await params;

    // Find the franchisee document assignment
    const franchiseeDocument = await db.franchiseeDocument.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            docType: true,
          },
        },
      },
    });

    if (!franchiseeDocument) {
      return NextResponse.json({ error: 'Document assignment not found' }, { status: 404 });
    }

    // Verify this document belongs to the requesting franchisee
    if (franchiseeDocument.franchiseeAccountId !== prospect.franchiseeAccount.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already acknowledged
    if (franchiseeDocument.status === 'ACKNOWLEDGED' || franchiseeDocument.status === 'SIGNED') {
      return NextResponse.json(
        { error: 'Document already acknowledged' },
        { status: 400 }
      );
    }

    // Update the franchisee document status
    const updated = await db.franchiseeDocument.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: session.user.email,
      },
    });

    // Log activity on the prospect's record
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: 'DOCUMENT_SIGNED', // Closest activity type for acknowledgment
        description: `Acknowledged document: "${franchiseeDocument.document.title}"`,
        metadata: {
          franchiseeDocumentId: id,
          documentId: franchiseeDocument.document.id,
          documentTitle: franchiseeDocument.document.title,
          docType: franchiseeDocument.document.docType,
        },
      },
    });

    return NextResponse.json({
      franchiseeDocument: {
        id: updated.id,
        status: updated.status,
        acknowledgedAt: updated.acknowledgedAt,
        acknowledgedBy: updated.acknowledgedBy,
      },
    });
  } catch (error) {
    console.error('Error acknowledging document:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge document' },
      { status: 500 }
    );
  }
}
