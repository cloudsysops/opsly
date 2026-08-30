import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/franchisee/documents - Get franchisee's document portal
export async function GET() {
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

    const franchiseeAccountId = prospect.franchiseeAccount.id;

    const franchiseeDocuments = await db.franchiseeDocument.findMany({
      where: { franchiseeAccountId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            description: true,
            docType: true,
            category: true,
            version: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            isPublic: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Categorize documents by status for the portal
    const pending = franchiseeDocuments.filter(
      (fd) => fd.status === 'PENDING' || fd.status === 'SIGNATURE_PENDING'
    );
    const acknowledged = franchiseeDocuments.filter(
      (fd) => fd.status === 'ACKNOWLEDGED' || fd.status === 'SIGNED'
    );
    const viewed = franchiseeDocuments.filter((fd) => fd.status === 'VIEWED');

    return NextResponse.json({
      documents: franchiseeDocuments.map((fd) => ({
        id: fd.id,
        documentId: fd.document.id,
        title: fd.document.title,
        description: fd.document.description,
        docType: fd.document.docType,
        category: fd.document.category,
        version: fd.document.version,
        fileUrl: fd.document.fileUrl,
        fileName: fd.document.fileName,
        fileSize: fd.document.fileSize,
        mimeType: fd.document.mimeType,
        expiresAt: fd.document.expiresAt,
        status: fd.status,
        acknowledgedAt: fd.acknowledgedAt,
        acknowledgedBy: fd.acknowledgedBy,
        createdAt: fd.createdAt,
      })),
      summary: {
        total: franchiseeDocuments.length,
        pendingAction: pending.length,
        acknowledged: acknowledged.length,
        viewed: viewed.length,
      },
    });
  } catch (error) {
    console.error('Error fetching franchisee documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
