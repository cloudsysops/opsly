import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generatePreWorkEvaluation,
  getPreWorkEvaluation,
} from "@/lib/ai/prework-evaluation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/prospects/[id]/evaluation
 * Get existing pre-work evaluation for a prospect
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prospectId } = await params;

    // Verify prospect exists
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
      select: { id: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    const evaluation = await getPreWorkEvaluation(prospectId);

    return NextResponse.json({
      success: true,
      evaluation,
    });
  } catch (error) {
    console.error("Error fetching evaluation:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prospects/[id]/evaluation
 * Generate or refresh pre-work evaluation for a prospect
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prospectId } = await params;

    // Verify prospect exists and has submissions
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
      include: {
        preWorkSubmissions: {
          where: { status: { in: ["SUBMITTED", "APPROVED"] } },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    if (prospect.preWorkSubmissions.length === 0) {
      return NextResponse.json(
        { error: "No submitted pre-work modules found" },
        { status: 400 }
      );
    }

    // Generate evaluation
    const evaluation = await generatePreWorkEvaluation(prospectId);

    if (!evaluation) {
      return NextResponse.json(
        { error: "Failed to generate evaluation" },
        { status: 500 }
      );
    }

    // Fetch the saved evaluation to return complete data
    const savedEvaluation = await getPreWorkEvaluation(prospectId);

    return NextResponse.json({
      success: true,
      evaluation: savedEvaluation,
    });
  } catch (error) {
    console.error("Error generating evaluation:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
