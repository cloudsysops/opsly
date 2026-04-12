import { NotionClient } from "../notion-client.js";
import type { DailyStandup } from "../types.js";

export interface AddStandupResult {
  readonly success: true;
  readonly standup: DailyStandup;
  readonly message: string;
}

export async function handleAddStandup(
  params: Omit<DailyStandup, "id">,
): Promise<AddStandupResult> {
  const notion = new NotionClient();
  const standup = await notion.addStandup(params);
  return {
    success: true,
    standup,
    message: `Standup recorded for ${standup.date}`,
  };
}
