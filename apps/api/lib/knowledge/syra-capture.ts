/**
 * Optional knowledge capture for Syra / social flows.
 * No-op unless `SYRA_KNOWLEDGE_CAPTURE_URL` is configured (POST JSON).
 */

type CapturePayload = Record<string, unknown>;

async function postCapture(body: CapturePayload): Promise<void> {
  const url = process.env.SYRA_KNOWLEDGE_CAPTURE_URL?.trim();
  if (!url) {
    return;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`knowledge capture HTTP ${res.status}`);
  }
}

export async function capturePublishEvent(
  eventType: string,
  platforms: string[],
  payload: CapturePayload
): Promise<void> {
  await postCapture({
    kind: 'event',
    event_type: eventType,
    platforms,
    payload,
  });
}

export async function capturePublishError(
  platform: string,
  error: string,
  context: string
): Promise<void> {
  await postCapture({
    kind: 'error',
    platform,
    error,
    context,
  });
}
