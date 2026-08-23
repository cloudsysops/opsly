import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { evaluateCondition } from "@/lib/automation/conditions";
import type { FlowData, FlowNode, FlowEdge } from "@/lib/automation/flow-engine";

export const dynamic = "force-dynamic";

interface TestStep {
  nodeId: string;
  nodeType: string;
  action?: string;
  result: string;
}

/**
 * POST /api/admin/workflows/[id]/test
 * Dry-run test: simulate graph traversal against a prospect WITHOUT executing actions
 */
export async function POST(
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
    const { prospectId } = body;

    if (!prospectId) {
      return NextResponse.json(
        { error: "prospectId is required" },
        { status: 400 }
      );
    }

    // Fetch workflow with actions and conditions
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

    // Fetch prospect
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // Parse flow data
    const rawFlowData = workflow.flowData as unknown as FlowData | null;
    if (!rawFlowData || !rawFlowData.nodes || !rawFlowData.edges) {
      return NextResponse.json(
        { error: "Workflow has no flow data to test" },
        { status: 400 }
      );
    }

    // Bind non-null references for use in nested functions
    // (TypeScript narrowing doesn't persist into closures)
    const flowData = rawFlowData;
    const wf = workflow;
    const pr = prospect;

    // Build adjacency map
    const adjacency = new Map<string, FlowEdge[]>();
    for (const edge of flowData.edges) {
      const existing = adjacency.get(edge.source) || [];
      existing.push(edge);
      adjacency.set(edge.source, existing);
    }

    // Find the trigger node (entry point)
    const triggerNode = flowData.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) {
      return NextResponse.json(
        { error: "No trigger node found in workflow" },
        { status: 400 }
      );
    }

    // Simulate graph traversal (dry-run)
    const steps: TestStep[] = [];
    const visited = new Set<string>();

    function processNode(node: FlowNode) {
      switch (node.type) {
        case "action": {
          const action = wf.actions.find((a) => a.nodeId === node.id);
          steps.push({
            nodeId: node.id,
            nodeType: "action",
            action: action?.actionType || "unknown",
            result: action
              ? `Would execute ${action.actionType}`
              : "No matching action found",
          });
          simulateWalk(node.id);
          break;
        }

        case "wait": {
          const waitAction = wf.actions.find((a) => a.nodeId === node.id);
          steps.push({
            nodeId: node.id,
            nodeType: "wait",
            action: "WAIT",
            result: waitAction
              ? `Would wait ${waitAction.delayMinutes} minutes, then continue`
              : "No matching wait action found",
          });
          // Continue walking past wait in simulation (unlike real execution)
          simulateWalk(node.id);
          break;
        }

        case "condition": {
          const condition = wf.conditions.find(
            (c) => c.nodeId === node.id
          );
          if (!condition) {
            steps.push({
              nodeId: node.id,
              nodeType: "condition",
              result: "No matching condition found",
            });
            break;
          }

          const condResult = evaluateCondition(condition, pr);
          steps.push({
            nodeId: node.id,
            nodeType: "condition",
            result: `${condition.field} ${condition.operator} ${condition.value} => ${condResult ? "YES" : "NO"}`,
          });

          // Follow only the matching branch
          visited.add(node.id);
          const conditionEdges = adjacency.get(node.id) || [];
          const matchingEdge = conditionEdges.find(
            (e) => e.sourceHandle === (condResult ? "yes" : "no")
          );
          if (matchingEdge) {
            const branchTarget = flowData.nodes.find(
              (n: FlowNode) => n.id === matchingEdge.target
            );
            if (branchTarget && !visited.has(branchTarget.id)) {
              processNode(branchTarget);
            }
          }
          break;
        }

        default: {
          steps.push({
            nodeId: node.id,
            nodeType: node.type,
            result: `Passed through ${node.type} node`,
          });
          simulateWalk(node.id);
          break;
        }
      }
    }

    function simulateWalk(startNodeId: string) {
      if (visited.has(startNodeId)) return; // prevent cycles
      visited.add(startNodeId);

      const outgoingEdges = adjacency.get(startNodeId) || [];

      for (const edge of outgoingEdges) {
        const targetNode = flowData.nodes.find(
          (n: FlowNode) => n.id === edge.target
        );
        if (!targetNode) continue;
        if (visited.has(targetNode.id)) continue;

        processNode(targetNode);
      }
    }

    // Start simulation from trigger node
    steps.push({
      nodeId: triggerNode.id,
      nodeType: "trigger",
      result: `Trigger: ${workflow.triggerType}`,
    });
    simulateWalk(triggerNode.id);

    return NextResponse.json({
      steps,
      prospect: {
        id: prospect.id,
        name: `${prospect.firstName} ${prospect.lastName}`,
        score: prospect.prospectScore,
        stage: prospect.pipelineStage,
      },
    });
  } catch (error) {
    console.error("[Workflow Test] Error:", error);
    return NextResponse.json(
      { error: "Failed to test workflow" },
      { status: 500 }
    );
  }
}
