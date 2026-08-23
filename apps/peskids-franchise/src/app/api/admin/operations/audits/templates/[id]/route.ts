import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AuditItemType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/audits/templates/[id] - Single template with items
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

    const template = await db.auditTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching audit template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/operations/audits/templates/[id] - Update template and items
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
    const { name, description, category, isActive, items } = body;

    const existing = await db.auditTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = await db.$transaction(async (tx) => {
      // Build update data
      const updateData: Record<string, unknown> = {};
      if (name !== undefined) {
        updateData.name = name;
        // Regenerate slug if name changes
        updateData.slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (isActive !== undefined) updateData.isActive = isActive;

      await tx.auditTemplate.update({
        where: { id },
        data: updateData,
      });

      // If items provided, delete existing and recreate
      if (items && Array.isArray(items)) {
        await tx.auditTemplateItem.deleteMany({
          where: { templateId: id },
        });

        if (items.length > 0) {
          await tx.auditTemplateItem.createMany({
            data: items.map(
              (
                item: {
                  question: string;
                  description?: string;
                  itemType?: string;
                  weight?: number;
                  sortOrder?: number;
                  isRequired?: boolean;
                },
                index: number
              ) => ({
                templateId: id,
                question: item.question,
                description: item.description || null,
                itemType: (item.itemType as AuditItemType) || AuditItemType.PASS_FAIL,
                weight: item.weight ?? 1,
                sortOrder: item.sortOrder ?? index,
                isRequired: item.isRequired ?? true,
              })
            ),
          });
        }
      }

      return tx.auditTemplate.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating audit template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/operations/audits/templates/[id] - Delete template
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

    const existing = await db.auditTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Cascade deletes items via schema onDelete: Cascade
    await db.auditTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting audit template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
