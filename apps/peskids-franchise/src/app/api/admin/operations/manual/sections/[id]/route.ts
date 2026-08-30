import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// PUT /api/admin/operations/manual/sections/[id] - Update a section
export async function PUT(
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
    const { title, description, icon, sortOrder } = body;

    // Check section exists
    const existing = await db.manualSection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Build update data
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (icon !== undefined) data.icon = icon || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    // If title changed, update slug too
    if (title !== undefined && title.trim() !== existing.title) {
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check slug uniqueness (exclude current section)
      const slugConflict = await db.manualSection.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: 'A section with a similar title already exists' },
          { status: 409 }
        );
      }
      data.slug = newSlug;
    }

    const section = await db.manualSection.update({
      where: { id },
      data,
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error('Error updating manual section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/operations/manual/sections/[id] - Delete a section (cascades to pages)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.manualSection.findUnique({
      where: { id },
      include: { _count: { select: { pages: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    // Delete section (cascades to pages, which cascade to versions and acknowledgments)
    await db.manualSection.delete({ where: { id } });

    console.log(
      `[Manual] Section "${existing.title}" (${existing._count.pages} pages) deleted by ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Section "${existing.title}" and ${existing._count.pages} page(s) deleted`,
    });
  } catch (error) {
    console.error('Error deleting manual section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}
