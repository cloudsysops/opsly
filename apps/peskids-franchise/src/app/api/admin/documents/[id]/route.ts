import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/documents/[id] - Get single document with versions and franchisee assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            uploadedByEmail: true,
            createdAt: true,
          },
        },
        franchiseeDocuments: {
          include: {
            franchiseeAccount: {
              include: {
                prospect: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    preferredTerritory: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        docType: document.docType,
        category: document.category,
        version: document.version,
        parentId: document.parentId,
        fileUrl: document.fileUrl,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        isPublic: document.isPublic,
        franchiseeOnly: document.franchiseeOnly,
        expiresAt: document.expiresAt,
        reminderSentAt: document.reminderSentAt,
        uploadedById: document.uploadedById,
        uploadedByEmail: document.uploadedByEmail,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        versions: document.versions,
        franchiseeDocuments: document.franchiseeDocuments.map((fd) => ({
          id: fd.id,
          franchiseeAccountId: fd.franchiseeAccountId,
          prospectId: fd.franchiseeAccount.prospect.id,
          franchiseeName: `${fd.franchiseeAccount.prospect.firstName} ${fd.franchiseeAccount.prospect.lastName}`,
          franchiseeEmail: fd.franchiseeAccount.prospect.email,
          territory: fd.franchiseeAccount.prospect.preferredTerritory,
          status: fd.status,
          acknowledgedAt: fd.acknowledgedAt,
          acknowledgedBy: fd.acknowledgedBy,
          createdAt: fd.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/documents/[id] - Update document metadata
export async function PATCH(
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
    const { title, description, docType, category, isPublic, franchiseeOnly, expiresAt } = body;

    // Verify document exists
    const existing = await db.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (docType !== undefined) updateData.docType = docType;
    if (category !== undefined) updateData.category = category;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (franchiseeOnly !== undefined) updateData.franchiseeOnly = franchiseeOnly;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const document = await db.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/documents/[id] - Delete document and associated records
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify document exists
    const existing = await db.document.findUnique({
      where: { id },
      include: {
        _count: {
          select: { franchiseeDocuments: true, versions: true },
        },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete franchisee document associations first (cascading would handle this,
    // but being explicit for clarity)
    await db.franchiseeDocument.deleteMany({
      where: { documentId: id },
    });

    // Delete version documents (children pointing to this as parent)
    await db.document.deleteMany({
      where: { parentId: id },
    });

    // Delete the document itself
    await db.document.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
