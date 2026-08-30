import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

/**
 * GET /api/admin/workflows/[id]/executions
 * Paginated execution history for a workflow
 */
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
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const statusFilter = searchParams.get("status") || undefined;

    // Verify workflow exists and get its action IDs
    const workflow = await db.workflowTrigger.findUnique({
      where: { id },
      include: { actions: { select: { id: true } } },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    const actionIds = workflow.actions.map((a) => a.id);

    if (actionIds.length === 0) {
      return NextResponse.json({
        executions: [],
        total: 0,
        page,
        perPage: PER_PAGE,
        totalPages: 0,
      });
    }

    // Build where clause
    const where: Record<string, unknown> = {
      actionId: { in: actionIds },
    };
    if (statusFilter) {
      where.status = statusFilter;
    }

    // Get total count and paginated executions in parallel
    const [total, executions] = await Promise.all([
      db.workflowExecution.count({ where }),
      db.workflowExecution.findMany({
        where,
        include: {
          prospect: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          action: {
            select: {
              actionType: true,
              nodeId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
    ]);

    const totalPages = Math.ceil(total / PER_PAGE);

    return NextResponse.json({
      executions,
      total,
      page,
      perPage: PER_PAGE,
      totalPages,
    });
  } catch (error) {
    console.error("[Workflow Executions] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch executions" },
      { status: 500 }
    );
  }
}
