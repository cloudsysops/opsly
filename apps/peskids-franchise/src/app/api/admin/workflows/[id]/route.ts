import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/workflows/[id]
 * Get a single workflow with flow data, actions, and conditions
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workflow = await db.workflowTrigger.findUnique({
      where: { id },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("[Workflow GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/workflows/[id]
 * Full save (canvas + data). Main "Save" endpoint.
 * Uses replace strategy for actions and conditions.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, triggerType, triggerConfig, category, flowData, actions, conditions } = body;

    // Verify workflow exists
    const existing = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Build the update payload for trigger-level fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig;
    if (category !== undefined) updateData.category = category;
    if (flowData !== undefined) updateData.flowData = flowData;

    // Use a transaction to atomically replace actions/conditions
    const workflow = await db.$transaction(async (tx) => {
      // If actions provided: delete all existing, create new ones
      if (actions !== undefined) {
        await tx.workflowAction.deleteMany({ where: { triggerId: id } });
        if (actions.length > 0) {
          await tx.workflowAction.createMany({
            data: actions.map(
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
                triggerId: id,
                actionType: a.actionType,
                actionConfig: a.actionConfig || {},
                delayMinutes: a.delayMinutes || 0,
                order: a.order ?? i,
                nodeId: a.nodeId || null,
              })
            ),
          });
        }
      }

      // If conditions provided: delete all existing, create new ones
      if (conditions !== undefined) {
        await tx.workflowCondition.deleteMany({ where: { triggerId: id } });
        if (conditions.length > 0) {
          await tx.workflowCondition.createMany({
            data: conditions.map(
              (c: {
                nodeId: string;
                field: string;
                operator: string;
                value: string;
              }) => ({
                triggerId: id,
                nodeId: c.nodeId,
                field: c.field,
                operator: c.operator,
                value: c.value,
              })
            ),
          });
        }
      }

      // Update the trigger record
      return tx.workflowTrigger.update({
        where: { id },
        data: updateData,
        include: {
          actions: { orderBy: { order: "asc" } },
          conditions: true,
        },
      });
    });

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("[Workflow PUT] Error:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/workflows/[id]
 * Delete workflow (cascades to actions/conditions/executions via Prisma onDelete)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify workflow exists
    const existing = await db.workflowTrigger.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    await db.workflowTrigger.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Workflow DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
