import { db } from "@/lib/db";

const PROMPT_COOLDOWN_HOURS = 24;
const DISMISS_COOLDOWN_DAYS = 7;

export async function canShowPrompt(prospectId: string): Promise<boolean> {
  const throttle = await db.feedbackThrottle.findUnique({
    where: { prospectId },
  });

  if (!throttle) return true;

  const now = new Date();
  const hoursSincePrompt = (now.getTime() - throttle.lastPromptAt.getTime()) / (1000 * 60 * 60);

  if (hoursSincePrompt < PROMPT_COOLDOWN_HOURS) return false;

  if (throttle.lastDismissAt) {
    const daysSinceDismiss = (now.getTime() - throttle.lastDismissAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDismiss < DISMISS_COOLDOWN_DAYS) return false;
  }

  return true;
}

export async function recordPromptShown(prospectId: string): Promise<void> {
  await db.feedbackThrottle.upsert({
    where: { prospectId },
    create: {
      prospectId,
      lastPromptAt: new Date(),
      promptCount: 1,
    },
    update: {
      lastPromptAt: new Date(),
      promptCount: { increment: 1 },
    },
  });
}

export async function recordDismissal(prospectId: string): Promise<void> {
  await db.feedbackThrottle.upsert({
    where: { prospectId },
    create: {
      prospectId,
      lastPromptAt: new Date(),
      lastDismissAt: new Date(),
    },
    update: {
      lastDismissAt: new Date(),
    },
  });
}
