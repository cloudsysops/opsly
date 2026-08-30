// Workflow Automation Engine
// Executes workflow triggers and actions based on prospect events

import { db } from "@/lib/db";
import type {
  WorkflowTrigger,
  WorkflowAction,
  WorkflowExecution,
  Prospect,
  TriggerType,
  ActionType,
  ExecutionStatus,
} from "@prisma/client";

import { executeFlowGraph, resumeFlowGraph } from "./flow-engine";

// Action executors
import { executeEmailAction } from "./actions/send-email";
import { executeTaskAction } from "./actions/create-task";
import { executeNotifyAdminAction } from "./actions/notify-admin";
import { executeStageChangeAction } from "./actions/change-stage";
import { executeNoteAction } from "./actions/add-note";

export interface TriggerContext {
  prospectId: string;
  prospect: Prospect;
  previousStage?: string;
  newStage?: string;
  formType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Find workflows that match a trigger type and optional conditions
 */
export async function findMatchingWorkflows(
  triggerType: TriggerType,
  context: TriggerContext
): Promise<WorkflowTrigger[]> {
  const workflows = await db.workflowTrigger.findMany({
    where: {
      triggerType,
      isActive: true,
    },
    include: {
      actions: {
        orderBy: { order: "asc" },
      },
    },
  });

  // Filter by trigger config conditions
  return workflows.filter((workflow) => {
    const config = workflow.triggerConfig as Record<string, unknown> | null;

    if (!config) return true;

    // Check stage change conditions
    if (triggerType === "STAGE_CHANGE") {
      const { fromStage, toStage } = config;

      if (fromStage && fromStage !== context.previousStage) return false;
      if (toStage && toStage !== context.newStage) return false;
    }

    // Check form type conditions
    if (triggerType === "FORM_SUBMITTED") {
      const { formType } = config;
      if (formType && formType !== context.formType) return false;
    }

    // Check prospect score threshold
    if (config.minScore && context.prospect.prospectScore < (config.minScore as number)) {
      return false;
    }

    // Check territory conditions
    if (config.territory && context.prospect.preferredTerritory !== config.territory) {
      return false;
    }

    return true;
  });
}

/**
 * Execute all actions for a workflow
 */
export async function executeWorkflow(
  workflow: WorkflowTrigger & { actions: WorkflowAction[] },
  context: TriggerContext
): Promise<void> {
  // If this workflow has flowData, use graph traversal
  if (workflow.flowData) {
    const fullWorkflow = await db.workflowTrigger.findUnique({
      where: { id: workflow.id },
      include: { actions: true, conditions: true },
    });
    if (fullWorkflow) {
      await executeFlowGraph(fullWorkflow, context);
      return;
    }
  }

  console.log(`[Workflow] Executing "${workflow.name}" for prospect ${context.prospectId}`);

  for (const action of workflow.actions) {
    try {
      // Create execution record
      const execution = await db.workflowExecution.create({
        data: {
          actionId: action.id,
          prospectId: context.prospectId,
          status: action.delayMinutes > 0 ? "SCHEDULED" : "RUNNING",
          scheduledFor: action.delayMinutes > 0
            ? new Date(Date.now() + action.delayMinutes * 60 * 1000)
            : null,
        },
      });

      // If action has delay, schedule it for later
      if (action.delayMinutes > 0) {
        console.log(`[Workflow] Action "${action.actionType}" scheduled for ${action.delayMinutes} minutes`);
        continue;
      }

      // Execute immediately
      await executeAction(action, context, execution);
    } catch (error) {
      console.error(`[Workflow] Error executing action ${action.id}:`, error);
    }
  }

  // Log workflow trigger activity
  await db.prospectActivity.create({
    data: {
      prospectId: context.prospectId,
      activityType: "WORKFLOW_TRIGGERED",
      description: `Workflow "${workflow.name}" triggered`,
      performedBy: "system:workflow",
      metadata: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        triggerType: workflow.triggerType,
        actionCount: workflow.actions.length,
      },
    },
  });
}

/**
 * Execute a single action
 */
export async function executeAction(
  action: WorkflowAction,
  context: TriggerContext,
  execution: WorkflowExecution
): Promise<void> {
  const config = action.actionConfig as Record<string, unknown>;

  console.log(`[Workflow] Executing action: ${action.actionType}`);

  try {
    let result: Record<string, unknown> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedConfig = config as any;

    switch (action.actionType) {
      case "SEND_EMAIL":
        result = await executeEmailAction(context, typedConfig);
        break;

      case "CREATE_TASK":
        result = await executeTaskAction(context, typedConfig);
        break;

      case "NOTIFY_ADMIN":
        result = await executeNotifyAdminAction(context, typedConfig);
        break;

      case "CHANGE_STAGE":
        result = await executeStageChangeAction(context, typedConfig);
        break;

      case "ADD_NOTE":
        result = await executeNoteAction(context, typedConfig);
        break;

      case "WAIT":
        // WAIT actions complete immediately — the cron handles resuming
        result = { waited: true, delayMinutes: action.delayMinutes };
        break;

      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }

    // Update execution as completed
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "COMPLETED",
        executedAt: new Date(),
        result: result as object,
      },
    });

    console.log(`[Workflow] Action ${action.actionType} completed`);
  } catch (error) {
    console.error(`[Workflow] Action ${action.actionType} failed:`, error);

    // Update execution as failed
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        executedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Process scheduled actions that are due
 * Called by cron job
 */
export async function processScheduledActions(): Promise<number> {
  const now = new Date();

  // Find scheduled executions that are due
  const dueExecutions = await db.workflowExecution.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: {
        lte: now,
      },
    },
    include: {
      action: true,
      prospect: true,
    },
    take: 50, // Process in batches
  });

  console.log(`[Workflow Processor] Found ${dueExecutions.length} due executions`);

  let processed = 0;

  for (const execution of dueExecutions) {
    const context: TriggerContext = {
      prospectId: execution.prospectId,
      prospect: execution.prospect,
    };

    // Mark as running
    await db.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "RUNNING" },
    });

    await executeAction(execution.action, context, execution);
    processed++;

    // If this was a WAIT action, resume the flow graph
    if (
      execution.action.actionType === "WAIT" &&
      execution.resumeFromNodeId
    ) {
      const trigger = await db.workflowTrigger.findFirst({
        where: {
          actions: { some: { id: execution.actionId } },
        },
      });
      if (trigger) {
        await resumeFlowGraph(
          trigger.id,
          execution.prospectId,
          execution.resumeFromNodeId
        );
      }
    }
  }

  return processed;
}

/**
 * Cancel pending executions for a prospect
 * Useful when a prospect moves to a different stage before actions complete
 */
export async function cancelPendingExecutions(
  prospectId: string,
  reason?: string
): Promise<number> {
  const result = await db.workflowExecution.updateMany({
    where: {
      prospectId,
      status: { in: ["PENDING", "SCHEDULED"] },
    },
    data: {
      status: "CANCELLED",
      errorMessage: reason || "Cancelled by system",
    },
  });

  console.log(`[Workflow] Cancelled ${result.count} pending executions for ${prospectId}`);

  return result.count;
}

// Trigger-specific helpers

/**
 * Trigger workflows for a new inquiry
 */
export async function triggerNewInquiry(prospect: Prospect): Promise<void> {
  const context: TriggerContext = {
    prospectId: prospect.id,
    prospect,
  };

  const workflows = await findMatchingWorkflows("NEW_INQUIRY", context);

  for (const workflow of workflows) {
    await executeWorkflow(workflow as WorkflowTrigger & { actions: WorkflowAction[] }, context);
  }
}

/**
 * Trigger workflows for a stage change
 */
export async function triggerStageChange(
  prospect: Prospect,
  previousStage: string,
  newStage: string
): Promise<void> {
  const context: TriggerContext = {
    prospectId: prospect.id,
    prospect,
    previousStage,
    newStage,
  };

  const workflows = await findMatchingWorkflows("STAGE_CHANGE", context);

  for (const workflow of workflows) {
    await executeWorkflow(workflow as WorkflowTrigger & { actions: WorkflowAction[] }, context);
  }
}

/**
 * Trigger workflows for pre-work completion
 */
export async function triggerPreworkCompleted(prospect: Prospect): Promise<void> {
  const context: TriggerContext = {
    prospectId: prospect.id,
    prospect,
  };

  const workflows = await findMatchingWorkflows("PREWORK_COMPLETED", context);

  for (const workflow of workflows) {
    await executeWorkflow(workflow as WorkflowTrigger & { actions: WorkflowAction[] }, context);
  }
}
