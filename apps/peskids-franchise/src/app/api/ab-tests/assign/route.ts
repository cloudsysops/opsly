import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  testSlug: z.string(),
  visitorId: z.string(),
});

const convertSchema = z.object({
  testSlug: z.string(),
  visitorId: z.string(),
  conversionValue: z.number().optional(),
});

// POST: Get or assign a variant for a visitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testSlug, visitorId } = assignSchema.parse(body);

    // Get the test
    const test = await db.aBTest.findUnique({
      where: { slug: testSlug },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Check if test is running
    if (test.status !== "RUNNING") {
      return NextResponse.json({
        variant: null,
        reason: "test_not_running",
      });
    }

    // Check date range
    const now = new Date();
    if (test.startDate && now < test.startDate) {
      return NextResponse.json({
        variant: null,
        reason: "test_not_started",
      });
    }
    if (test.endDate && now > test.endDate) {
      return NextResponse.json({
        variant: null,
        reason: "test_ended",
      });
    }

    // Check if visitor already has an assignment
    const existing = await db.aBTestAssignment.findUnique({
      where: {
        testId_visitorId: {
          testId: test.id,
          visitorId,
        },
      },
    });

    if (existing) {
      const variants = test.variants as any[];
      const variant = variants.find((v) => v.id === existing.variantId);
      return NextResponse.json({
        variant,
        variantId: existing.variantId,
        isNew: false,
      });
    }

    // Check traffic allocation
    if (test.trafficPercent < 100) {
      // Use consistent hashing based on visitorId to determine if in test
      const hash = simpleHash(visitorId + test.slug);
      const inTest = (hash % 100) < test.trafficPercent;

      if (!inTest) {
        return NextResponse.json({
          variant: null,
          reason: "not_in_traffic_sample",
        });
      }
    }

    // Assign a variant based on weights
    const variants = test.variants as any[];
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const random = simpleHash(visitorId + test.slug + "variant") % totalWeight;

    let cumulative = 0;
    let selectedVariant = variants[0];
    for (const variant of variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    // Create assignment
    await db.aBTestAssignment.create({
      data: {
        testId: test.id,
        visitorId,
        variantId: selectedVariant.id,
      },
    });

    return NextResponse.json({
      variant: selectedVariant,
      variantId: selectedVariant.id,
      isNew: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("A/B assignment error:", error);
    return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
  }
}

// PUT: Record a conversion
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { testSlug, visitorId, conversionValue } = convertSchema.parse(body);

    // Get the test
    const test = await db.aBTest.findUnique({
      where: { slug: testSlug },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Find assignment
    const assignment = await db.aBTestAssignment.findUnique({
      where: {
        testId_visitorId: {
          testId: test.id,
          visitorId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({
        success: false,
        reason: "no_assignment",
      });
    }

    if (assignment.converted) {
      return NextResponse.json({
        success: true,
        reason: "already_converted",
      });
    }

    // Record conversion
    await db.aBTestAssignment.update({
      where: { id: assignment.id },
      data: {
        converted: true,
        convertedAt: new Date(),
        conversionValue: conversionValue || null,
      },
    });

    return NextResponse.json({
      success: true,
      variantId: assignment.variantId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("A/B conversion error:", error);
    return NextResponse.json({ error: "Conversion tracking failed" }, { status: 500 });
  }
}

// Simple hash function for consistent assignment
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
