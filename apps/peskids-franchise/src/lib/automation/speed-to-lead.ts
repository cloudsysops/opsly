// Speed-to-Lead Automation
// Sends instant responses when a new inquiry is submitted

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import { welcomeProspectEmail } from "@/lib/email/templates";
import type { Prospect } from "@prisma/client";

interface SpeedToLeadConfig {
  sendWelcomeEmail: boolean;
  createFollowUpTask: boolean;
  notifyAdmin: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SpeedToLeadConfig = {
  sendWelcomeEmail: true,
  createFollowUpTask: true,
  notifyAdmin: true,
};

// Admin emails to notify
const ADMIN_EMAILS = [
  "franchising@acmefranchise.com",
  "admin@acmefranchise.com",
];

/**
 * Get speed-to-lead configuration
 * In the future, this could pull from a database settings table
 */
export async function getSpeedToLeadConfig(): Promise<SpeedToLeadConfig> {
  // For now, return default config
  // Future: return db.settings.findUnique({ where: { key: "speed-to-lead" } });
  return DEFAULT_CONFIG;
}

/**
 * Execute speed-to-lead automation for a new prospect
 * This runs in fire-and-forget mode - don't await in the API route
 */
export async function executeSpeedToLead(
  prospect: Pick<Prospect, "id" | "firstName" | "lastName" | "email" | "phone" | "preferredTerritory" | "interestLevel" | "prospectScore">
): Promise<void> {
  const config = await getSpeedToLeadConfig();
  const startTime = Date.now();

  console.log(`[Speed-to-Lead] Starting for ${prospect.email}`);

  const results: Record<string, boolean> = {};

  // 1. Welcome Email
  if (config.sendWelcomeEmail) {
    try {
      const { subject, html } = welcomeProspectEmail({
        firstName: prospect.firstName,
      });

      const success = await sendEmail({
        to: prospect.email,
        subject,
        html,
      });

      results.welcomeEmail = success;

      if (success) {
        console.log(`[Speed-to-Lead] Welcome email sent to ${prospect.email}`);
      }
    } catch (err) {
      console.error("[Speed-to-Lead] Welcome email error:", err);
      results.welcomeEmail = false;
    }
  }

  // 3. Create Follow-Up Task
  if (config.createFollowUpTask) {
    try {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + 4); // Due in 4 hours

      await db.crmTask.create({
        data: {
          prospectId: prospect.id,
          title: `Follow up with ${prospect.firstName} ${prospect.lastName}`,
          description: `New inquiry received. Score: ${prospect.prospectScore}. Interest: ${prospect.interestLevel}. Territory: ${prospect.preferredTerritory || "Not specified"}.`,
          dueDate,
          priority: prospect.prospectScore >= 70 ? "HIGH" : "MEDIUM",
          status: "PENDING",
          assignedTo: ADMIN_EMAILS[0],
          createdBy: "system:speed-to-lead",
        },
      });

      results.followUpTask = true;
      console.log(`[Speed-to-Lead] Follow-up task created`);
    } catch (err) {
      console.error("[Speed-to-Lead] Task creation error:", err);
      results.followUpTask = false;
    }
  }

  // 4. Admin Notification (done separately via notifyNewInquiry, but log here)
  results.adminNotification = config.notifyAdmin;

  // Log activity
  await db.prospectActivity.create({
    data: {
      prospectId: prospect.id,
      activityType: "WORKFLOW_TRIGGERED",
      description: "Speed-to-lead automation executed",
      performedBy: "system:speed-to-lead",
      metadata: {
        results,
        durationMs: Date.now() - startTime,
      },
    },
  });

  console.log(`[Speed-to-Lead] Completed in ${Date.now() - startTime}ms`, results);
}

/**
 * Check if a prospect should trigger speed-to-lead
 * Can be extended with rules (e.g., only high-score prospects)
 */
export function shouldTriggerSpeedToLead(
  prospect: Pick<Prospect, "email" | "prospectScore" | "interestLevel">
): boolean {
  // Always trigger for new inquiries
  // Future: Add rules like "only if score > X" or "only certain territories"
  return true;
}
