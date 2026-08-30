import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const minRating = searchParams.get("minRating");
    const maxRating = searchParams.get("maxRating");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating)
        (where.rating as Record<string, number>).gte = parseInt(minRating, 10);
      if (maxRating)
        (where.rating as Record<string, number>).lte = parseInt(maxRating, 10);
    }

    if (search) {
      where.pageUrl = { contains: search, mode: "insensitive" };
    }

    const [items, total] = await Promise.all([
      db.feedback.findMany({
        where,
        include: {
          prospect: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.feedback.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Failed to fetch recent feedback:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}
