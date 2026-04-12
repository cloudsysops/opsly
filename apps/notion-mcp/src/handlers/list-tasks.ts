import { NotionClient } from "../notion-client.js";
import type { Task } from "../types.js";

export interface ListTasksResult {
  readonly success: true;
  readonly count: number;
  readonly tasks: Task[];
  readonly message: string;
}

export async function handleListTasks(params: {
  readonly sprint?: string;
  readonly status?: string;
}): Promise<ListTasksResult> {
  const notion = new NotionClient();
  const tasks = await notion.listTasks(params.sprint, params.status);
  return {
    success: true,
    count: tasks.length,
    tasks,
    message: `Retrieved ${String(tasks.length)} tasks`,
  };
}
