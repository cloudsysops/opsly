export async function runCursorJob(payload: Record<string, unknown>): Promise<void> {
  if (!payload.task) {
    throw new Error("CursorJob requires 'task' in payload");
  }
}
