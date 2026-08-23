import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/workflows/[id]/toggle
 * Toggle workflow active status
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get current workflow
    const workflow = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    // Toggle active status
    const updated = await db.workflowTrigger.update({
      where: { id },
      data: { isActive: !workflow.isActive },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
      },
    });

    return NextResponse.json({ workflow: updated });
  } catch (error) {
    console.error("[Workflow Toggle] Error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
