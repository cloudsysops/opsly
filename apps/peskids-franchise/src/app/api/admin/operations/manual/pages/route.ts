import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/manual/pages - List pages with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionId = searchParams.get('sectionId') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: Record<string, unknown> = {};
    if (sectionId) where.sectionId = sectionId;
    if (status) where.status = status;

    const pages = await db.manualPage.findMany({
      where,
      include: {
        section: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
          },
        },
        _count: {
          select: { acknowledgments: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        sectionId: p.sectionId,
        section: p.section,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        sortOrder: p.sortOrder,
        status: p.status,
        requiresAcknowledgment: p.requiresAcknowledgment,
        currentVersion: p.currentVersion,
        publishedAt: p.publishedAt,
        publishedBy: p.publishedBy,
        acknowledgmentCount: p._count.acknowledgments,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching manual pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    );
  }
}

// POST /api/admin/operations/manual/pages - Create a new page
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sectionId, title, content, excerpt, requiresAcknowledgment } = body;

    if (!sectionId || !title || !content) {
      return NextResponse.json(
        { error: 'sectionId, title, and content are required' },
        { status: 400 }
      );
    }

    // Verify section exists
    const section = await db.manualSection.findUnique({
      where: { id: sectionId },
    });
    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existingSlug = await db.manualPage.findUnique({ where: { slug } });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'A page with a similar title already exists' },
        { status: 409 }
      );
    }

    // Auto-increment sortOrder within the section
    const maxOrder = await db.manualPage.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    // Create page and initial version in a transaction
    const page = await db.$transaction(async (tx) => {
      const newPage = await tx.manualPage.create({
        data: {
          sectionId,
          title: title.trim(),
          slug,
          content,
          excerpt: excerpt?.trim() || null,
          sortOrder,
          requiresAcknowledgment: requiresAcknowledgment ?? false,
          currentVersion: 1,
        },
      });

      // Create initial version
      await tx.manualPageVersion.create({
        data: {
          pageId: newPage.id,
          versionNumber: 1,
          content,
          changeType: 'MAJOR',
          changeSummary: 'Initial version',
          createdBy: session.user.email,
        },
      });

      return newPage;
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error('Error creating manual page:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}
