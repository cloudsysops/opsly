/**
 * Multi-platform social publish adapter.
 * When `SYRA_SOCIAL_PUBLISH_WEBHOOK_URL` is set, POSTs JSON to that webhook per platform.
 * Otherwise returns a stub success (no outbound call) so local/CI type-check and dry runs stay safe.
 */

export type ContentPayload = Record<string, unknown>;

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

function previewForPlatform(content: ContentPayload, platform: string): string {
  const slice = content[platform];
  if (slice && typeof slice === 'object' && slice !== null) {
    const o = slice as Record<string, unknown>;
    if (typeof o.body === 'string') {
      return o.body.slice(0, 280);
    }
    if (Array.isArray(o.threads)) {
      const first = o.threads[0];
      return typeof first === 'string' ? first.slice(0, 280) : '';
    }
    if (typeof o.text === 'string') {
      return o.text.slice(0, 280);
    }
    if (typeof o.content === 'string') {
      return o.content.slice(0, 280);
    }
  }
  return '';
}

async function publishToPlatform(platform: string, content: ContentPayload): Promise<PublishResult> {
  const webhook = process.env.SYRA_SOCIAL_PUBLISH_WEBHOOK_URL?.trim();

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          fragment: content[platform] ?? null,
          preview: previewForPlatform(content, platform),
        }),
      });

      if (!res.ok) {
        return { platform, success: false, error: `publish webhook HTTP ${res.status}` };
      }

      const data = (await res.json()) as { url?: string };
      return {
        platform,
        success: true,
        url: typeof data.url === 'string' ? data.url : undefined,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { platform, success: false, error: message };
    }
  }

  const base = process.env.SYRA_STUB_PUBLISH_BASE_URL?.replace(/\/$/, '');
  return {
    platform,
    success: true,
    ...(base ? { url: `${base}/${encodeURIComponent(platform)}` } : {}),
  };
}

export const multiPlatformPublisher = {
  async publishToAll(content: ContentPayload, platforms: string[]): Promise<PublishResult[]> {
    return Promise.all(platforms.map((p) => publishToPlatform(p, content)));
  },
};
