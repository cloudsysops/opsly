// Graph Traversal Engine for Visual Workflow Builder
// Handles execution of flow-based (React Flow canvas) workflows with branching and WAIT resume

import { db } from "@/lib/db";
import type {
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCondition,
  Prospect,
} from "@prisma/client";
import { evaluateCondition } from "./conditions";
import { executeAction, type TriggerContext } from "./workflow-engine";

// ============================================
// INTERFACES
// ============================================

export interface FlowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export type WorkflowWithRelations = WorkflowTrigger & {
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
};

// ============================================
// ADJACENCY MAP BUILDER
// ============================================

/**
 * Build an adjacency map from edges: source nodeId -> outgoing edges
 */
export function buildAdjacencyMap(
  edges: FlowEdge[]
): Map<string, FlowEdge[]> {
  const map = new Map<string, FlowEdge[]>();
  for (const edge of edges) {
    const existing = map.get(edge.source) || [];
    existing.push(edge);
    map.set(edge.source, existing);
  }
  return map;
}

// ============================================
// GRAPH WALKER
// ============================================

/**
 * Recursively walk the graph from a starting node, executing actions,
 * evaluating conditions, and stopping at WAIT nodes.
 */
async function walkGraph(
  startNodeId: string,
  adjacency: Map<string, FlowEdge[]>,
  nodes: FlowNode[],
  workflow: WorkflowWithRelations,
  context: TriggerContext
): Promise<void> {
  const outgoingEdges = adjacency.get(startNodeId) || [];

  for (const edge of outgoingEdges) {
    const targetNode = nodes.find((n) => n.id === edge.target);
    if (!targetNode) continue;

    switch (targetNode.type) {
      case "action": {
        // Find the matching WorkflowAction by nodeId
        const action = workflow.actions.find(
          (a) => a.nodeId === targetNode.id
        );
        if (!action) {
          console.warn(
            `[FlowEngine] No action found for node ${targetNode.id}`
          );
          break;
        }

        // Create execution record
        const execution = await db.workflowExecution.create({
          data: {
            actionId: action.id,
            prospectId: context.prospectId,
            status: "RUNNING",
            nodeId: targetNode.id,
          },
        });

        // Execute the action
        await executeAction(action, context, execution);

        // Continue walking from this node
        await walkGraph(
          targetNode.id,
          adjacency,
          nodes,
          workflow,
          context
        );
        break;
      }

      case "wait": {
        // Find the WAIT action by nodeId
        const waitAction = workflow.actions.find(
          (a) => a.nodeId === targetNode.id
        );
        if (!waitAction) {
          console.warn(
            `[FlowEngine] No wait action found for node ${targetNode.id}`
          );
          break;
        }

        // Calculate when to resume
        const scheduledFor = new Date(
          Date.now() + waitAction.delayMinutes * 60 * 1000
        );

        // Create scheduled execution — cron will pick this up later
        await db.workflowExecution.create({
          data: {
            actionId: waitAction.id,
            prospectId: context.prospectId,
            status: "SCHEDULED",
            scheduledFor,
            nodeId: targetNode.id,
            resumeFromNodeId: targetNode.id,
          },
        });

        console.log(
          `[FlowEngine] WAIT node ${targetNode.id}: scheduled for ${scheduledFor.toISOString()}`
        );

        // STOP walking — cron resumes later via resumeFlowGraph
        break;
      }

      case "condition": {
        // Find the WorkflowCondition by nodeId
        const condition = workflow.conditions.find(
          (c) => c.nodeId === targetNode.id
        );
        if (!condition) {
          console.warn(
            `[FlowEngine] No condition found for node ${targetNode.id}`
          );
          break;
        }

        // Evaluate the condition against the prospect
        const result = evaluateCondition(condition, context.prospect);

        console.log(
          `[FlowEngine] Condition "${condition.field} ${condition.operator} ${condition.value}": ${result}`
        );

        // Get outgoing edges from the condition node
        const conditionEdges = adjacency.get(targetNode.id) || [];

        // Find the edge matching the result (yes/no handle)
        const matchingEdge = conditionEdges.find(
          (e) => e.sourceHandle === (result ? "yes" : "no")
        );

        if (matchingEdge) {
          // Walk only the matching branch
          const branchTarget = nodes.find(
            (n) => n.id === matchingEdge.target
          );
          if (branchTarget) {
            // We need to walk from the condition node but only follow the matched edge
            // So we simulate walking by directly processing the branch target
            await walkGraphFromEdge(
              matchingEdge,
              adjacency,
              nodes,
              workflow,
              context
            );
          }
        }
        break;
      }

      default:
        // Unknown node type — continue walking past it
        await walkGraph(
          targetNode.id,
          adjacency,
          nodes,
          workflow,
          context
        );
        break;
    }
  }
}

/**
 * Helper to walk the graph starting from a specific edge target.
 * Used by condition branching to walk only the chosen branch.
 */
async function walkGraphFromEdge(
  edge: FlowEdge,
  adjacency: Map<string, FlowEdge[]>,
  nodes: FlowNode[],
  workflow: WorkflowWithRelations,
  context: TriggerContext
): Promise<void> {
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (!targetNode) return;

  // Process the target node the same way walkGraph does
  switch (targetNode.type) {
    case "action": {
      const action = workflow.actions.find(
        (a) => a.nodeId === targetNode.id
      );
      if (!action) break;

      const execution = await db.workflowExecution.create({
        data: {
          actionId: action.id,
          prospectId: context.prospectId,
          status: "RUNNING",
          nodeId: targetNode.id,
        },
      });

      await executeAction(action, context, execution);
      await walkGraph(targetNode.id, adjacency, nodes, workflow, context);
      break;
    }

    case "wait": {
      const waitAction = workflow.actions.find(
        (a) => a.nodeId === targetNode.id
      );
      if (!waitAction) break;

      const scheduledFor = new Date(
        Date.now() + waitAction.delayMinutes * 60 * 1000
      );

      await db.workflowExecution.create({
        data: {
          actionId: waitAction.id,
          prospectId: context.prospectId,
          status: "SCHEDULED",
          scheduledFor,
          nodeId: targetNode.id,
          resumeFromNodeId: targetNode.id,
        },
      });

      console.log(
        `[FlowEngine] WAIT node ${targetNode.id}: scheduled for ${scheduledFor.toISOString()}`
      );
      break;
    }

    case "condition": {
      const condition = workflow.conditions.find(
        (c) => c.nodeId === targetNode.id
      );
      if (!condition) break;

      const result = evaluateCondition(condition, context.prospect);
      const conditionEdges = adjacency.get(targetNode.id) || [];
      const matchingEdge = conditionEdges.find(
        (e) => e.sourceHandle === (result ? "yes" : "no")
      );

      if (matchingEdge) {
        await walkGraphFromEdge(
          matchingEdge,
          adjacency,
          nodes,
          workflow,
          context
        );
      }
      break;
    }

    default:
      await walkGraph(targetNode.id, adjacency, nodes, workflow, context);
      break;
  }
}

// ============================================
// ENTRY POINTS
// ============================================

/**
 * Execute a flow-based workflow from the trigger node.
 * Called by executeWorkflow() when a workflow has flowData.
 */
export async function executeFlowGraph(
  workflow: WorkflowWithRelations,
  context: TriggerContext
): Promise<void> {
  console.log(
    `[FlowEngine] Executing flow graph "${workflow.name}" for prospect ${context.prospectId}`
  );

  // Parse the flow data
  const flowData = workflow.flowData as unknown as FlowData;
  if (!flowData || !flowData.nodes || !flowData.edges) {
    console.error(
      `[FlowEngine] Invalid flowData for workflow ${workflow.id}`
    );
    return;
  }

  // Build adjacency map
  const adjacency = buildAdjacencyMap(flowData.edges);

  // Find the trigger node (entry point)
  const triggerNode = flowData.nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    console.error(
      `[FlowEngine] No trigger node found in workflow ${workflow.id}`
    );
    return;
  }

  // Walk the graph from the trigger node
  await walkGraph(
    triggerNode.id,
    adjacency,
    flowData.nodes,
    workflow,
    context
  );

  // Log workflow trigger activity
  await db.prospectActivity.create({
    data: {
      prospectId: context.prospectId,
      activityType: "WORKFLOW_TRIGGERED",
      description: `Flow workflow "${workflow.name}" triggered`,
      performedBy: "system:workflow",
      metadata: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        triggerType: workflow.triggerType,
        actionCount: workflow.actions.length,
        conditionCount: workflow.conditions.length,
        isFlowBased: true,
      },
    },
  });
}

/**
 * Resume a flow graph after a WAIT node completes.
 * Called by processScheduledActions() when a WAIT execution fires.
 */
export async function resumeFlowGraph(
  workflowId: string,
  prospectId: string,
  resumeFromNodeId: string
): Promise<void> {
  console.log(
    `[FlowEngine] Resuming workflow ${workflowId} from node ${resumeFromNodeId} for prospect ${prospectId}`
  );

  // Fetch the workflow with all relations
  const workflow = await db.workflowTrigger.findUnique({
    where: { id: workflowId },
    include: { actions: true, conditions: true },
  });

  if (!workflow) {
    console.error(
      `[FlowEngine] Workflow ${workflowId} not found for resume`
    );
    return;
  }

  // Re-fetch prospect for fresh data (conditions may evaluate differently now)
  const prospect = await db.prospect.findUnique({
    where: { id: prospectId },
  });

  if (!prospect) {
    console.error(
      `[FlowEngine] Prospect ${prospectId} not found for resume`
    );
    return;
  }

  // Parse flow data and build adjacency
  const flowData = workflow.flowData as unknown as FlowData;
  if (!flowData || !flowData.nodes || !flowData.edges) {
    console.error(
      `[FlowEngine] Invalid flowData for workflow ${workflow.id} during resume`
    );
    return;
  }

  const adjacency = buildAdjacencyMap(flowData.edges);

  const context: TriggerContext = {
    prospectId,
    prospect,
  };

  // Resume walking from the WAIT node
  await walkGraph(
    resumeFromNodeId,
    adjacency,
    flowData.nodes,
    workflow,
    context
  );
}
