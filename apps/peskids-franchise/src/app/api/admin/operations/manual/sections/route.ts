import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/manual/sections - List all sections with page counts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sections = await db.manualSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { pages: true },
        },
      },
    });

    return NextResponse.json({
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        slug: s.slug,
        description: s.description,
        icon: s.icon,
        sortOrder: s.sortOrder,
        pagesCount: s._count.pages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching manual sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

// POST /api/admin/operations/manual/sections - Create a new section
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, icon } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await db.manualSection.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'A section with a similar title already exists' },
        { status: 409 }
      );
    }

    // Auto-increment sortOrder
    const maxOrder = await db.manualSection.aggregate({
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const section = await db.manualSection.create({
      data: {
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon || null,
        sortOrder,
      },
    });

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    console.error('Error creating manual section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}
