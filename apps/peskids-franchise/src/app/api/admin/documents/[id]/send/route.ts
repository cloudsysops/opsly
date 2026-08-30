import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// POST /api/admin/documents/[id]/send - Send document to franchisee(s) for acknowledgment/signature
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { franchiseeAccountIds, requireSignature } = body;

    // Validate input
    if (!franchiseeAccountIds || !Array.isArray(franchiseeAccountIds) || franchiseeAccountIds.length === 0) {
      return NextResponse.json(
        { error: 'franchiseeAccountIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Verify the document exists
    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Verify all franchisee accounts exist and get prospect info for activity logging
    const franchiseeAccounts = await db.franchiseeAccount.findMany({
      where: {
        id: { in: franchiseeAccountIds },
      },
      include: {
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

    if (franchiseeAccounts.length !== franchiseeAccountIds.length) {
      const foundIds = franchiseeAccounts.map((fa) => fa.id);
      const missingIds = franchiseeAccountIds.filter((fid: string) => !foundIds.includes(fid));
      return NextResponse.json(
        { error: `Franchisee accounts not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    const status = requireSignature ? 'SIGNATURE_PENDING' : 'PENDING';

    // Create FranchiseeDocument records and ProspectActivity entries
    const results = await Promise.all(
      franchiseeAccounts.map(async (fa) => {
        // Upsert to handle re-sending to the same franchisee
        const franchiseeDocument = await db.franchiseeDocument.upsert({
          where: {
            franchiseeAccountId_documentId: {
              franchiseeAccountId: fa.id,
              documentId: id,
            },
          },
          update: {
            status,
            acknowledgedAt: null,
            acknowledgedBy: null,
          },
          create: {
            franchiseeAccountId: fa.id,
            documentId: id,
            status,
          },
        });

        // Log activity on the prospect's record
        await db.prospectActivity.create({
          data: {
            prospectId: fa.prospect.id,
            activityType: 'DOCUMENT_DOWNLOADED', // Closest existing activity type for doc sent
            description: `Document "${document.title}" sent for ${requireSignature ? 'signature' : 'acknowledgment'}`,
            performedBy: session.user.email,
            metadata: {
              documentId: id,
              documentTitle: document.title,
              docType: document.docType,
              requireSignature: !!requireSignature,
              franchiseeDocumentId: franchiseeDocument.id,
            },
          },
        });

        return {
          franchiseeAccountId: fa.id,
          franchiseeName: `${fa.prospect.firstName} ${fa.prospect.lastName}`,
          franchiseeDocumentId: franchiseeDocument.id,
          status,
        };
      })
    );

    return NextResponse.json({
      sent: results,
      documentId: id,
      documentTitle: document.title,
      totalSent: results.length,
    });
  } catch (error) {
    console.error('Error sending document to franchisees:', error);
    return NextResponse.json(
      { error: 'Failed to send document' },
      { status: 500 }
    );
  }
}
