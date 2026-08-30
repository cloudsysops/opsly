import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma, ResourceCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// Valid categories for type checking
const VALID_CATEGORIES = new Set<string>([
  "OPERATIONS",
  "MARKETING",
  "SALES",
  "TRAINING",
  "LEGAL",
  "FINANCIAL",
  "TEMPLATES",
]);

// GET /api/franchisee/bootcamp/resources - Get academy resources for franchisee
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prospect and verify they are SELECTED
    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Academy resources are only available to selected franchisees" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Build where clause
    const where: Prisma.AcademyResourceWhereInput = {
      isPublic: true,
    };

    if (category && category !== "ALL" && VALID_CATEGORIES.has(category)) {
      where.category = category as ResourceCategory;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { description: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Fetch resources
    const resources = await db.academyResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Get counts by category
    const categoryCounts = await db.academyResource.groupBy({
      by: ["category"],
      where: { isPublic: true },
      _count: { id: true },
    });

    const counts: Record<string, number> = {
      ALL: 0,
    };

    categoryCounts.forEach((c) => {
      counts[c.category] = c._count.id;
      counts.ALL += c._count.id;
    });

    return NextResponse.json({
      resources,
      counts,
    });
  } catch (error) {
    console.error("Franchisee academy resources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch academy resources" },
      { status: 500 }
    );
  }
}
