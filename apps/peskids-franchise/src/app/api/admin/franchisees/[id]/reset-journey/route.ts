import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/admin/franchisees/[id]/reset-journey - Reset a franchisee's 90-day journey to Day 1
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the prospect
    const prospect = await db.prospect.findUnique({
      where: { id },
      select: { id: true, pipelineStage: true, firstName: true, lastName: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Only SELECTED franchisees can have their journey reset" },
        { status: 400 }
      );
    }

    // Reset selectedAt to now (makes today Day 1)
    await db.prospect.update({
      where: { id },
      data: { selectedAt: new Date() },
    });

    // Delete all academy progress for this prospect
    await db.academyProgress.deleteMany({
      where: { prospectId: id },
    });

    // Reset enrollment statuses back to ENROLLED
    await db.programEnrollment.updateMany({
      where: { prospectId: id },
      data: {
        status: "ENROLLED",
        startedAt: null,
        completedAt: null,
      },
    });

    // Delete franchisor todos for this prospect
    await db.franchisorTodo.deleteMany({
      where: { prospectId: id },
    });

    return NextResponse.json({
      success: true,
      message: `Journey reset for ${prospect.firstName} ${prospect.lastName}. Today is now Day 1.`,
    });
  } catch (error) {
    console.error("Error resetting journey:", error);
    return NextResponse.json(
      { error: "Failed to reset journey" },
      { status: 500 }
    );
  }
}
