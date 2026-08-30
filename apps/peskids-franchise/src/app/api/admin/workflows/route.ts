import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/workflows
 * List all non-template workflows with 30-day execution stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all non-template workflows with actions and conditions
    const workflows = await db.workflowTrigger.findMany({
      where: { isTemplate: false },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
        _count: { select: { actions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get 30-day execution stats grouped by actionId and status
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const executionStats = await db.workflowExecution.groupBy({
      by: ["actionId", "status"],
      _count: true,
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Build a map of actionId -> { total, failed }
    const statsMap = new Map<string, { total: number; failed: number }>();
    for (const stat of executionStats) {
      const existing = statsMap.get(stat.actionId) || {
        total: 0,
        failed: 0,
      };
      existing.total += stat._count;
      if (stat.status === "FAILED") {
        existing.failed += stat._count;
      }
      statsMap.set(stat.actionId, existing);
    }

    // Map stats onto each workflow
    const workflowsWithStats = workflows.map((wf) => {
      let totalExecutions = 0;
      let failedExecutions = 0;
      for (const action of wf.actions) {
        const actionStats = statsMap.get(action.id);
        if (actionStats) {
          totalExecutions += actionStats.total;
          failedExecutions += actionStats.failed;
        }
      }
      return {
        ...wf,
        stats: {
          totalExecutions,
          failedExecutions,
          period: "30d",
        },
      };
    });

    return NextResponse.json({ workflows: workflowsWithStats });
  } catch (error) {
    console.error("[Workflows GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/workflows
 * Create a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, triggerType, triggerConfig, category, flowData, actions, conditions } = body;

    if (!name || !triggerType) {
      return NextResponse.json(
        { error: "name and triggerType are required" },
        { status: 400 }
      );
    }

    const workflow = await db.workflowTrigger.create({
      data: {
        name,
        triggerType,
        triggerConfig: triggerConfig || {},
        category: category || null,
        flowData: flowData || null,
        actions: actions?.length
          ? {
              create: actions.map(
                (
                  a: {
                    actionType: string;
                    actionConfig: Record<string, unknown>;
                    delayMinutes?: number;
                    order?: number;
                    nodeId?: string;
                  },
                  i: number
                ) => ({
                  actionType: a.actionType,
                  actionConfig: a.actionConfig || {},
                  delayMinutes: a.delayMinutes || 0,
                  order: a.order ?? i,
                  nodeId: a.nodeId || null,
                })
              ),
            }
          : undefined,
        conditions: conditions?.length
          ? {
              create: conditions.map(
                (c: {
                  nodeId: string;
                  field: string;
                  operator: string;
                  value: string;
                }) => ({
                  nodeId: c.nodeId,
                  field: c.field,
                  operator: c.operator,
                  value: c.value,
                })
              ),
            }
          : undefined,
      },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error("[Workflows POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
