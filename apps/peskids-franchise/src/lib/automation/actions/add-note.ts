// Workflow Action: Add Note

import { db } from "@/lib/db";
import type { TriggerContext } from "../workflow-engine";

interface NoteActionConfig {
  content: string;
  isPinned?: boolean;
}

export async function executeNoteAction(
  context: TriggerContext,
  config: NoteActionConfig
): Promise<{ success: boolean; noteId?: string; error?: string }> {
  const { prospect } = context;

  // Replace variables in content
  const content = replaceVariables(config.content, context);

  try {
    const note = await db.prospectNote.create({
      data: {
        prospectId: prospect.id,
        content,
        authorEmail: "system:workflow",
        isPinned: config.isPinned || false,
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "NOTE_ADDED",
        description: `Automated note added: "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`,
        performedBy: "system:workflow",
        metadata: {
          noteId: note.id,
          automated: true,
        },
      },
    });

    return { success: true, noteId: note.id };
  } catch (error) {
    console.error("[Add Note Action] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add note",
    };
  }
}

function replaceVariables(
  template: string,
  context: TriggerContext
): string {
  const { prospect, previousStage, newStage } = context;

  return template
    .replace(/\{\{firstName\}\}/g, prospect.firstName)
    .replace(/\{\{lastName\}\}/g, prospect.lastName)
    .replace(/\{\{fullName\}\}/g, `${prospect.firstName} ${prospect.lastName}`)
    .replace(/\{\{email\}\}/g, prospect.email)
    .replace(/\{\{territory\}\}/g, prospect.preferredTerritory || "Not specified")
    .replace(/\{\{score\}\}/g, prospect.prospectScore.toString())
    .replace(/\{\{stage\}\}/g, prospect.pipelineStage.replace(/_/g, " "))
    .replace(/\{\{previousStage\}\}/g, previousStage?.replace(/_/g, " ") || "")
    .replace(/\{\{newStage\}\}/g, newStage?.replace(/_/g, " ") || "")
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
    .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
}
