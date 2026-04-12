import { NotionClient } from "../notion-client.js";
import type { Task } from "../types.js";

export interface UpdateTaskResult {
  readonly success: true;
  readonly task: Task;
  readonly message: string;
}

export async function handleUpdateTask(params: {
  readonly taskId: string;
  readonly updates: Partial<Task>;
}): Promise<UpdateTaskResult> {
  const notion = new NotionClient();
  const task = await notion.updateTask(params.taskId, params.updates);
  return {
    success: true,
    task,
    message: `Task updated: ${task.title}`,
  };
}
