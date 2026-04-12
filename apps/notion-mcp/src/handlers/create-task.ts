import { NotionClient } from "../notion-client.js";
import type { Task } from "../types.js";

export interface CreateTaskResult {
  readonly success: true;
  readonly task: Task;
  readonly message: string;
}

export async function handleCreateTask(
  params: Omit<Task, "id" | "created" | "updated">,
): Promise<CreateTaskResult> {
  const notion = new NotionClient();
  const task = await notion.createTask(params);
  return {
    success: true,
    task,
    message: `Task created: ${task.title}`,
  };
}
