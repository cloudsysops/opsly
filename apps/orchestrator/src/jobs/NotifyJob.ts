export async function runNotifyJob(payload: Record<string, unknown>): Promise<void> {
  if (!payload.message) {
    throw new Error("NotifyJob requires 'message' in payload");
  }
}
