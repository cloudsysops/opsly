import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { removeManualPageFromKnowledgeBase } from "@/lib/knowledge-base/pipeline";

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/manual/pages/[id] - Get single page with section, versions, ack count
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

    const page = await db.manualPage.findUnique({
      where: { id },
      include: {
        section: {
          select: {
            id: true,
            title: true,
            slug: true,
            icon: true,
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 20,
        },
        _count: {
          select: { acknowledgments: true },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({
      page: {
        id: page.id,
        sectionId: page.sectionId,
        section: page.section,
        title: page.title,
        slug: page.slug,
        content: page.content,
        excerpt: page.excerpt,
        sortOrder: page.sortOrder,
        status: page.status,
        requiresAcknowledgment: page.requiresAcknowledgment,
        currentVersion: page.currentVersion,
        publishedAt: page.publishedAt,
        publishedBy: page.publishedBy,
        acknowledgmentCount: page._count.acknowledgments,
        versions: page.versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          changeType: v.changeType,
          changeSummary: v.changeSummary,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        })),
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching manual page:', error);
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/operations/manual/pages/[id] - Update a page
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
    const {
      title,
      content,
      excerpt,
      sectionId,
      sortOrder,
      requiresAcknowledgment,
      changeType,
      changeSummary,
    } = body;

    const existing = await db.manualPage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // If sectionId changed, verify new section exists
    if (sectionId && sectionId !== existing.sectionId) {
      const section = await db.manualSection.findUnique({
        where: { id: sectionId },
      });
      if (!section) {
        return NextResponse.json(
          { error: 'Target section not found' },
          { status: 404 }
        );
      }
    }

    const contentChanged =
      content !== undefined && content !== existing.content;

    const page = await db.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};

      if (title !== undefined) updateData.title = title.trim();
      if (excerpt !== undefined) updateData.excerpt = excerpt?.trim() || null;
      if (sectionId !== undefined) updateData.sectionId = sectionId;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
      if (requiresAcknowledgment !== undefined)
        updateData.requiresAcknowledgment = requiresAcknowledgment;

      if (contentChanged) {
        const newVersion = existing.currentVersion + 1;
        updateData.content = content;
        updateData.currentVersion = newVersion;

        // Create new version record
        await tx.manualPageVersion.create({
          data: {
            pageId: id,
            versionNumber: newVersion,
            content,
            changeType: changeType || 'MINOR',
            changeSummary: changeSummary || null,
            createdBy: session.user.email,
          },
        });

        // If MAJOR change and page requires acknowledgment, clear all acknowledgments
        const resolvedChangeType = changeType || 'MINOR';
        if (
          resolvedChangeType === 'MAJOR' &&
          (requiresAcknowledgment ?? existing.requiresAcknowledgment)
        ) {
          await tx.manualAcknowledgment.deleteMany({
            where: { pageId: id },
          });
        }
      }

      return tx.manualPage.update({
        where: { id },
        data: updateData,
        include: {
          section: {
            select: {
              id: true,
              title: true,
              slug: true,
              icon: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ page });
  } catch (error) {
    console.error('Error updating manual page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/operations/manual/pages/[id] - Delete a page
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

    const existing = await db.manualPage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Remove from RAG knowledge base
    removeManualPageFromKnowledgeBase(id).catch(console.error);

    // Delete page (cascades to versions and acknowledgments via schema)
    await db.manualPage.delete({ where: { id } });

    console.log(
      `[Manual] Page "${existing.title}" deleted by ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: `Page "${existing.title}" deleted`,
    });
  } catch (error) {
    console.error('Error deleting manual page:', error);
    return NextResponse.json(
      { error: 'Failed to delete page' },
      { status: 500 }
    );
  }
}
