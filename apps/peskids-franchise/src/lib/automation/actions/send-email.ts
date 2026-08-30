// Workflow Action: Send Email

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import type { TriggerContext } from "../workflow-engine";

interface EmailActionConfig {
  templateId?: string;
  templateSlug?: string;
  subject?: string;
  body?: string;
}

function replaceTemplateVars(
  template: string,
  variables: Record<string, string | undefined>
): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replaceAll(placeholder, value || "");
  }
  return rendered;
}

export async function executeEmailAction(
  context: TriggerContext,
  config: EmailActionConfig
): Promise<{ success: boolean; emailId?: string; error?: string }> {
  const { prospect } = context;

  let subject: string;
  let bodyHtml: string;

  // If using a template
  if (config.templateId || config.templateSlug) {
    const template = await db.emailTemplate.findFirst({
      where: config.templateId
        ? { id: config.templateId }
        : { slug: config.templateSlug },
    });

    if (!template) {
      return { success: false, error: "Template not found" };
    }

    // Render template with prospect data
    const variableContext = {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      fullName: `${prospect.firstName} ${prospect.lastName}`,
      email: prospect.email,
      phone: prospect.phone || undefined,
      territory: prospect.preferredTerritory || undefined,
      portalUrl: `${process.env.NEXTAUTH_URL}/portal`,
    };

    subject = replaceTemplateVars(template.subject, variableContext);
    bodyHtml = replaceTemplateVars(template.bodyHtml, variableContext);
  } else if (config.subject && config.body) {
    // Custom subject and body
    const variableContext = {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      fullName: `${prospect.firstName} ${prospect.lastName}`,
      email: prospect.email,
    };

    subject = replaceTemplateVars(config.subject, variableContext);
    bodyHtml = replaceTemplateVars(config.body, variableContext);
  } else {
    return { success: false, error: "No template or content provided" };
  }

  // Send email
  const success = await sendEmail({
    to: prospect.email,
    subject,
    html: bodyHtml,
  });

  if (success) {
    // Log sent email
    const sentEmail = await db.sentEmail.create({
      data: {
        prospectId: prospect.id,
        templateId: config.templateId,
        templateSlug: config.templateSlug || null,
        toEmail: prospect.email,
        subject,
        bodyHtml,
        bodyPreview: bodyHtml.replace(/<[^>]*>/g, "").substring(0, 200),
        sentBy: "system:workflow",
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "EMAIL_SENT",
        description: `Automated email sent: "${subject}"`,
        performedBy: "system:workflow",
        metadata: {
          emailId: sentEmail.id,
          templateSlug: config.templateSlug,
        },
      },
    });

    return { success: true, emailId: sentEmail.id };
  }

  return { success: false, error: "Failed to send email" };
}
