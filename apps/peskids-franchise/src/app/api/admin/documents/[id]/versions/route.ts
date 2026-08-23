import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

// POST /api/admin/documents/[id]/versions - Upload a new version of a document
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
    const { fileUrl, fileName, fileSize, mimeType } = body;

    // Validate required fields
    if (!fileUrl || !fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: fileUrl, fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    // Verify the parent document exists
    const parentDocument = await db.document.findUnique({
      where: { id },
      include: {
        versions: {
          select: { version: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!parentDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Calculate the next version number
    // Check max version among: the parent itself + all its existing versions
    const maxVersionFromChildren =
      parentDocument.versions.length > 0 ? parentDocument.versions[0].version : 0;
    const maxVersion = Math.max(parentDocument.version, maxVersionFromChildren);
    const nextVersion = maxVersion + 1;

    // Create the new version document with parentId pointing to the original
    const versionDocument = await db.document.create({
      data: {
        title: parentDocument.title,
        description: parentDocument.description,
        docType: parentDocument.docType,
        category: parentDocument.category,
        version: nextVersion,
        parentId: parentDocument.id,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        isPublic: parentDocument.isPublic,
        franchiseeOnly: parentDocument.franchiseeOnly,
        expiresAt: parentDocument.expiresAt,
        uploadedById: session.user.id,
        uploadedByEmail: session.user.email,
      },
    });

    return NextResponse.json({ document: versionDocument }, { status: 201 });
  } catch (error) {
    console.error('Error creating document version:', error);
    return NextResponse.json(
      { error: 'Failed to create document version' },
      { status: 500 }
    );
  }
}
