import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schema for creating/updating an A/B test
const testSchema = z.object({
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  targetPage: z.string().min(1),
  element: z.string().min(1),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number().min(0).max(100),
    config: z.record(z.unknown()),
  })),
  trafficPercent: z.number().min(0).max(100).default(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET: List all A/B tests or get a specific test
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const id = searchParams.get("id");
  const page = searchParams.get("page");
  const status = searchParams.get("status");

  try {
    if (id) {
      // Get specific test by ID
      const test = await db.aBTest.findUnique({
        where: { id },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
      });

      if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }

      // Get variant stats (assignments per variant)
      const variantAssignments = await db.aBTestAssignment.groupBy({
        by: ["variantId"],
        where: { testId: id },
        _count: true,
      });

      // Get conversions per variant
      const variantConversions = await db.aBTestAssignment.groupBy({
        by: ["variantId"],
        where: { testId: id, converted: true },
        _count: true,
      });

      const conversionMap = new Map(variantConversions.map((vc) => [vc.variantId, vc._count]));

      return NextResponse.json({
        test,
        stats: {
          totalAssignments: test._count.assignments,
          variantStats: variantAssignments.map((vs) => ({
            variantId: vs.variantId,
            assigned: vs._count,
            converted: conversionMap.get(vs.variantId) || 0,
          })),
        },
      });
    }

    if (slug) {
      // Get test by slug (for client-side assignment)
      const test = await db.aBTest.findUnique({
        where: { slug },
      });

      if (!test) {
        return NextResponse.json({ error: "Test not found" }, { status: 404 });
      }

      return NextResponse.json({ test });
    }

    // List tests with optional filters
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (page) {
      where.targetPage = page;
    }

    const tests = await db.aBTest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("A/B test fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch tests" }, { status: 500 });
  }
}

// POST: Create a new A/B test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = testSchema.parse(body);

    // Check if slug already exists
    const existing = await db.aBTest.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A test with this slug already exists" },
        { status: 400 }
      );
    }

    const test = await db.aBTest.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        targetPage: data.targetPage,
        element: data.element,
        variants: data.variants as any,  // JSON field
        trafficPercent: data.trafficPercent,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid test data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("A/B test create error:", error);
    return NextResponse.json({ error: "Failed to create test" }, { status: 500 });
  }
}

// PUT: Update an existing A/B test
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Test ID required" }, { status: 400 });
    }

    const test = await db.aBTest.update({
      where: { id },
      data: {
        ...updates,
        startDate: updates.startDate ? new Date(updates.startDate) : undefined,
        endDate: updates.endDate ? new Date(updates.endDate) : undefined,
      },
    });

    return NextResponse.json({ test });
  } catch (error) {
    console.error("A/B test update error:", error);
    return NextResponse.json({ error: "Failed to update test" }, { status: 500 });
  }
}

// DELETE: Delete an A/B test
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Test ID required" }, { status: 400 });
  }

  try {
    await db.aBTest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("A/B test delete error:", error);
    return NextResponse.json({ error: "Failed to delete test" }, { status: 500 });
  }
}
