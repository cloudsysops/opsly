import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { AuditItemType } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET /api/admin/operations/audits/templates - List all templates
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await db.auditTemplate.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            items: true,
            audits: true,
          },
        },
      },
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        category: t.category,
        isActive: t.isActive,
        itemCount: t._count.items,
        auditCount: t._count.audits,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching audit templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/operations/audits/templates - Create template with items
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith('@acmefranchise.com')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, category, items } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existing = await db.auditTemplate.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A template with a similar name already exists' },
        { status: 409 }
      );
    }

    // Create template and items in a transaction
    const template = await db.$transaction(async (tx) => {
      const created = await tx.auditTemplate.create({
        data: {
          name,
          slug,
          description: description || null,
          category,
        },
      });

      if (items && Array.isArray(items) && items.length > 0) {
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
              templateId: created.id,
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

      return tx.auditTemplate.findUnique({
        where: { id: created.id },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
          },
          _count: {
            select: { items: true, audits: true },
          },
        },
      });
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating audit template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
