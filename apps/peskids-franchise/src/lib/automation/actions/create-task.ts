// Workflow Action: Create Task

import { db } from "@/lib/db";
import type { TaskPriority } from "@prisma/client";
import type { TriggerContext } from "../workflow-engine";

interface TaskActionConfig {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDays?: number; // Days from now
  dueHours?: number; // Hours from now
}

export async function executeTaskAction(
  context: TriggerContext,
  config: TaskActionConfig
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const { prospect } = context;

  // Calculate due date
  let dueDate: Date | undefined;

  if (config.dueDays) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + config.dueDays);
  } else if (config.dueHours) {
    dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + config.dueHours);
  }

  // Replace variables in title and description
  const title = replaceVariables(config.title, prospect);
  const description = config.description
    ? replaceVariables(config.description, prospect)
    : undefined;

  try {
    const task = await db.crmTask.create({
      data: {
        prospectId: prospect.id,
        title,
        description,
        priority: config.priority || "MEDIUM",
        assignedTo: config.assignedTo,
        dueDate,
        status: "PENDING",
        createdBy: "system:workflow",
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "NOTE_ADDED",
        description: `Task created: "${title}"`,
        performedBy: "system:workflow",
        metadata: {
          taskId: task.id,
          priority: config.priority,
          assignedTo: config.assignedTo,
        },
      },
    });

    return { success: true, taskId: task.id };
  } catch (error) {
    console.error("[Create Task Action] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

function replaceVariables(
  template: string,
  prospect: { firstName: string; lastName: string; email: string; preferredTerritory: string | null; prospectScore: number }
): string {
  return template
    .replace(/\{\{firstName\}\}/g, prospect.firstName)
    .replace(/\{\{lastName\}\}/g, prospect.lastName)
    .replace(/\{\{fullName\}\}/g, `${prospect.firstName} ${prospect.lastName}`)
    .replace(/\{\{email\}\}/g, prospect.email)
    .replace(/\{\{territory\}\}/g, prospect.preferredTerritory || "Not specified")
    .replace(/\{\{score\}\}/g, prospect.prospectScore.toString());
}
