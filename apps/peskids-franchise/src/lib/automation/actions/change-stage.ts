// Workflow Action: Change Pipeline Stage

import { db } from "@/lib/db";
import type { PipelineStage } from "@prisma/client";
import type { TriggerContext } from "../workflow-engine";

interface StageChangeConfig {
  newStage: PipelineStage;
}

export async function executeStageChangeAction(
  context: TriggerContext,
  config: StageChangeConfig
): Promise<{ success: boolean; previousStage?: string; error?: string }> {
  const { prospect } = context;

  const previousStage = prospect.pipelineStage;

  // Don't change if already at target stage
  if (previousStage === config.newStage) {
    return {
      success: true,
      previousStage,
    };
  }

  try {
    // Update prospect stage
    await db.prospect.update({
      where: { id: prospect.id },
      data: {
        pipelineStage: config.newStage,
        // If moving to SELECTED, set selectedAt
        ...(config.newStage === "SELECTED" && !prospect.selectedAt
          ? { selectedAt: new Date() }
          : {}),
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "STAGE_CHANGED",
        description: `Pipeline stage changed from ${previousStage.replace(/_/g, " ")} to ${config.newStage.replace(/_/g, " ")}`,
        performedBy: "system:workflow",
        metadata: {
          previousStage,
          newStage: config.newStage,
        },
      },
    });

    return { success: true, previousStage };
  } catch (error) {
    console.error("[Change Stage Action] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to change stage",
    };
  }
}
