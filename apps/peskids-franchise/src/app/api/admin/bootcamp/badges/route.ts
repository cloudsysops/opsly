import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET - List all badges with earn counts
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const badges = await db.academyBadge.findMany({
      include: {
        _count: {
          select: { earnedBadges: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Format response
    const formattedBadges = badges.map((badge) => ({
      id: badge.id,
      slug: badge.slug,
      title: badge.title,
      description: badge.description,
      imageUrl: badge.imageUrl,
      points: badge.points,
      criteria: badge.criteria,
      createdAt: badge.createdAt,
      earnedCount: badge._count.earnedBadges,
    }));

    return NextResponse.json({ badges: formattedBadges });
  } catch (error) {
    console.error("Badges list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

// POST - Create a new badge
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, imageUrl, points, criteria } = body;

    if (!title || !description || !criteria) {
      return NextResponse.json(
        { error: "Title, description, and criteria are required" },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await db.academyBadge.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const badge = await db.academyBadge.create({
      data: {
        slug,
        title,
        description,
        imageUrl,
        points: points || 25,
        criteria,
      },
    });

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    console.error("Badge create error:", error);
    return NextResponse.json(
      { error: "Failed to create badge" },
      { status: 500 }
    );
  }
}
