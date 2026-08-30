import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/documents - List all documents with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const docType = searchParams.get('docType') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: Record<string, unknown> = {
      parentId: null, // Only return root documents, not versions
    };
    if (docType) where.docType = docType;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          versions: {
            select: { id: true },
          },
          _count: {
            select: {
              franchiseeDocuments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.document.count({ where }),
    ]);

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        docType: doc.docType,
        category: doc.category,
        version: doc.version,
        versionCount: doc.versions.length + 1, // Include the current version
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        isPublic: doc.isPublic,
        franchiseeOnly: doc.franchiseeOnly,
        expiresAt: doc.expiresAt,
        reminderSentAt: doc.reminderSentAt,
        uploadedByEmail: doc.uploadedByEmail,
        franchiseeDocumentCount: doc._count.franchiseeDocuments,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/admin/documents - Create new document record
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      docType,
      category,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      isPublic,
      franchiseeOnly,
      expiresAt,
    } = body;

    // Validate required fields
    if (!title || !docType || !category || !fileUrl || !fileName || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, docType, category, fileUrl, fileName, fileSize, mimeType' },
        { status: 400 }
      );
    }

    const document = await db.document.create({
      data: {
        title,
        description: description || null,
        docType,
        category,
        fileUrl,
        fileName,
        fileSize,
        mimeType,
        isPublic: isPublic ?? false,
        franchiseeOnly: franchiseeOnly ?? false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        uploadedById: session.user.id,
        uploadedByEmail: session.user.email,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}
