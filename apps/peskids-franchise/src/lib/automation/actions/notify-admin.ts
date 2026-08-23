// Workflow Action: Notify Admin

import { sendEmail } from "@/lib/email/sendgrid";
import type { TriggerContext } from "../workflow-engine";

interface NotifyAdminConfig {
  subject: string;
  message: string;
  recipients?: string[]; // Override default admins
  includeProspectDetails?: boolean;
}

const DEFAULT_ADMIN_EMAILS = [
  "franchising@acmefranchise.com",
  "admin@acmefranchise.com",
];

export async function executeNotifyAdminAction(
  context: TriggerContext,
  config: NotifyAdminConfig
): Promise<{ success: boolean; error?: string }> {
  const { prospect } = context;

  // Replace variables in subject and message
  const subject = replaceVariables(config.subject, context);
  const message = replaceVariables(config.message, context);

  const recipients = config.recipients || DEFAULT_ADMIN_EMAILS;

  // Build email content
  let html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D2F8E; margin-bottom: 16px;">${subject}</h2>
      <div style="padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; line-height: 1.6;">${message}</p>
      </div>
  `;

  // Optionally include prospect details
  if (config.includeProspectDetails !== false) {
    html += `
      <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
        <h3 style="color: #374151; font-size: 14px; margin: 0 0 12px;">Prospect Details</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Name</td>
            <td style="padding: 8px 0; font-weight: 500;">${prospect.firstName} ${prospect.lastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Email</td>
            <td style="padding: 8px 0;">
              <a href="mailto:${prospect.email}" style="color: #6A469D;">${prospect.email}</a>
            </td>
          </tr>
          ${prospect.phone ? `
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Phone</td>
            <td style="padding: 8px 0;">${prospect.phone}</td>
          </tr>
          ` : ""}
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Territory</td>
            <td style="padding: 8px 0;">${prospect.preferredTerritory || "Not specified"}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Score</td>
            <td style="padding: 8px 0;">${prospect.prospectScore}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Stage</td>
            <td style="padding: 8px 0;">${prospect.pipelineStage.replace(/_/g, " ")}</td>
          </tr>
        </table>
        <p style="margin: 16px 0 0;">
          <a href="${process.env.NEXTAUTH_URL}/admin/prospects/${prospect.id}"
             style="display: inline-block; padding: 12px 24px; background: #2D2F8E; color: white; text-decoration: none; border-radius: 50px; font-weight: 500;">
            View in CRM
          </a>
        </p>
      </div>
    `;
  }

  html += "</div>";

  const success = await sendEmail({
    to: recipients,
    subject: `[Acme Franchise] ${subject}`,
    html,
  });

  return { success };
}

function replaceVariables(
  template: string,
  context: TriggerContext
): string {
  const { prospect, previousStage, newStage } = context;

  return template
    .replace(/\{\{firstName\}\}/g, prospect.firstName)
    .replace(/\{\{lastName\}\}/g, prospect.lastName)
    .replace(/\{\{fullName\}\}/g, `${prospect.firstName} ${prospect.lastName}`)
    .replace(/\{\{email\}\}/g, prospect.email)
    .replace(/\{\{territory\}\}/g, prospect.preferredTerritory || "Not specified")
    .replace(/\{\{score\}\}/g, prospect.prospectScore.toString())
    .replace(/\{\{stage\}\}/g, prospect.pipelineStage.replace(/_/g, " "))
    .replace(/\{\{previousStage\}\}/g, previousStage?.replace(/_/g, " ") || "")
    .replace(/\{\{newStage\}\}/g, newStage?.replace(/_/g, " ") || "");
}
