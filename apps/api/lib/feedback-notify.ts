const WEBHOOK = process.env.DISCORD_WEBHOOK_URL ?? "";

const DISCORD_TITLE_MAX = 256;
const DISCORD_DESCRIPTION_MAX = 4096;

const COLORS = {
  success: 3066993,
  error: 15158332,
  warning: 16776960,
  info: 3447003,
} as const;

export async function notifyDiscordFeedback(
  title: string,
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
): Promise<void> {
  if (!WEBHOOK) {
    return;
  }
  await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: title.slice(0, DISCORD_TITLE_MAX),
          description: message.slice(0, DISCORD_DESCRIPTION_MAX),
          color: COLORS[type],
          timestamp: new Date().toISOString(),
          footer: { text: "Opsly · Feedback" },
        },
      ],
    }),
  }).catch(() => {});
}
