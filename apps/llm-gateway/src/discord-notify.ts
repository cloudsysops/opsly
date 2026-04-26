const COLORS: Record<'success' | 'error' | 'warning' | 'info', number> = {
  success: 3066993,
  error: 15158332,
  warning: 16776960,
  info: 3447003,
};

export async function notifyDiscord(
  title: string,
  description: string,
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? '';
  if (!webhook) {
    console.warn('[llm-gateway] DISCORD_WEBHOOK_URL vacía — notificación omitida');
    return;
  }

  const color = COLORS[type] ?? COLORS.info;
  const timestamp = new Date().toISOString();
  const host = process.env.HOSTNAME ?? 'llm-gateway';

  const payload = {
    embeds: [
      {
        title: title.slice(0, 256),
        description: description.slice(0, 4096),
        color,
        timestamp,
        fields: [{ name: 'Servicio', value: host, inline: true }],
        footer: { text: 'Opsly · LLM Gateway' },
      },
    ],
  };

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok && res.status !== 204) {
    const text = await res.text().catch(() => '');
    throw new Error(`Discord webhook HTTP ${res.status}: ${text}`);
  }
}
