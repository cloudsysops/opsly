export async function runN8nJob(payload: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || "";
  if (!webhookUrl) {
    throw new Error("N8N_WEBHOOK_URL is required");
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
