import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - Get single badge with earners
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const badge = await db.academyBadge.findUnique({
      where: { id },
      include: {
        earnedBadges: {
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
          orderBy: { earnedAt: "desc" },
        },
      },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Format response
    const response = {
      id: badge.id,
      slug: badge.slug,
      title: badge.title,
      description: badge.description,
      imageUrl: badge.imageUrl,
      points: badge.points,
      criteria: badge.criteria,
      createdAt: badge.createdAt,
      earners: badge.earnedBadges.map((eb) => ({
        id: eb.prospect.id,
        name: `${eb.prospect.firstName} ${eb.prospect.lastName}`,
        email: eb.prospect.email,
        earnedAt: eb.earnedAt,
      })),
    };

    return NextResponse.json({ badge: response });
  } catch (error) {
    console.error("Badge get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch badge" },
      { status: 500 }
    );
  }
}

// PUT - Update badge
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, imageUrl, points, criteria } = body;

    const existing = await db.academyBadge.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // If title changed, update slug
    let slug = existing.slug;
    if (title && title !== existing.title) {
      const baseSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      slug = baseSlug;
      let counter = 1;
      while (
        await db.academyBadge.findFirst({
          where: { slug, id: { not: id } },
        })
      ) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    const badge = await db.academyBadge.update({
      where: { id },
      data: {
        slug,
        title: title ?? existing.title,
        description: description ?? existing.description,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        points: points ?? existing.points,
        criteria: criteria ?? existing.criteria,
      },
    });

    return NextResponse.json({ badge });
  } catch (error) {
    console.error("Badge update error:", error);
    return NextResponse.json(
      { error: "Failed to update badge" },
      { status: 500 }
    );
  }
}

// DELETE - Delete badge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.academyBadge.findUnique({
      where: { id },
      include: { _count: { select: { earnedBadges: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Warn if badge has been earned
    const earnedCount = existing._count.earnedBadges;

    // Delete badge (will cascade to earnedBadges)
    await db.academyBadge.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      earnedRecordsDeleted: earnedCount,
    });
  } catch (error) {
    console.error("Badge delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete badge" },
      { status: 500 }
    );
  }
}
