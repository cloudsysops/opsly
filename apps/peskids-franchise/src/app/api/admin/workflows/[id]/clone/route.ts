import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/workflows/[id]/clone
 * Clone a workflow (used for "Use Template" flow and duplicating existing workflows)
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

    // Fetch source workflow with all relations
    const source = await db.workflowTrigger.findUnique({
      where: { id },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // If cloning a template, keep the name; otherwise append "(Copy)"
    const cloneName = source.isTemplate
      ? source.name
      : `${source.name} (Copy)`;

    // Create the clone with nested actions and conditions
    const workflow = await db.workflowTrigger.create({
      data: {
        name: cloneName,
        description: source.description,
        triggerType: source.triggerType,
        triggerConfig: source.triggerConfig || {},
        category: source.category,
        flowData: source.flowData || undefined,
        isTemplate: false,
        isActive: false,
        actions: {
          create: source.actions.map((a) => ({
            actionType: a.actionType,
            actionConfig: a.actionConfig || {},
            delayMinutes: a.delayMinutes,
            order: a.order,
            nodeId: a.nodeId,
          })),
        },
        conditions: {
          create: source.conditions.map((c) => ({
            nodeId: c.nodeId,
            field: c.field,
            operator: c.operator,
            value: c.value,
          })),
        },
      },
      include: {
        actions: { orderBy: { order: "asc" } },
        conditions: true,
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error("[Workflow Clone] Error:", error);
    return NextResponse.json(
      { error: "Failed to clone workflow" },
      { status: 500 }
    );
  }
}
