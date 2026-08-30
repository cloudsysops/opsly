import { sendGmail } from "@/lib/gmail/client";
import { db } from "@/lib/db";

interface CompletionEmailParams {
  template: {
    id: string;
    subject: string;
    bodyHtml: string;
    defaultTo: string | null;
    defaultCc: string | null;
    defaultFrom: string | null;
  };
  prospect: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  module: {
    id: string;
    title: string;
    slug: string;
  };
}

function resolveVariables(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] || "");
}

/**
 * Send a completion email via Gmail when a franchisee completes a module.
 * Creates a SentEmail record for audit trail and updates the FranchisorTodo.
 */
export async function sendCompletionEmail({
  template,
  prospect,
  module,
}: CompletionEmailParams): Promise<void> {
  // Look up franchisee account for market info
  const account = await db.franchiseeAccount.findUnique({
    where: { prospectId: prospect.id },
    include: {
      markets: { select: { name: true }, take: 1 },
    },
  });

  const context: Record<string, string> = {
    franchiseeEmail: prospect.email,
    franchiseeName: `${prospect.firstName} ${prospect.lastName}`,
    franchiseeFirstName: prospect.firstName,
    franchiseeLastName: prospect.lastName,
    marketName: account?.markets?.[0]?.name || "",
    moduleName: module.title,
  };

  const fromEmail =
    resolveVariables(template.defaultFrom || "", context) ||
    "franchising@acmefranchise.com";

  const toRaw = resolveVariables(template.defaultTo || "", context);
  const ccRaw = resolveVariables(template.defaultCc || "", context);

  const to = toRaw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const cc = ccRaw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (to.length === 0) {
    console.warn(
      `Completion email for module ${module.slug}: no TO recipients resolved, skipping`
    );
    return;
  }

  const subject = resolveVariables(template.subject, context);
  const htmlBody = resolveVariables(template.bodyHtml, context);

  // Send via Gmail
  const { messageId } = await sendGmail({
    fromEmail,
    to,
    cc: cc.length > 0 ? cc : undefined,
    subject,
    htmlBody,
  });

  // Create SentEmail audit record
  const bodyPreview = htmlBody
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  const sentEmail = await db.sentEmail.create({
    data: {
      prospectId: prospect.id,
      templateId: template.id,
      toEmail: to.join(", "),
      subject,
      bodyHtml: htmlBody,
      bodyPreview,
      sentBy: fromEmail,
    },
  });

  // Update the most recent FranchisorTodo for this module + prospect
  await db.franchisorTodo.updateMany({
    where: {
      prospectId: prospect.id,
      moduleId: module.id,
      sentEmailId: null,
    },
    data: {
      sentEmailId: sentEmail.id,
      sentEmailAt: new Date(),
    },
  });

  console.log(
    `Completion email sent for module "${module.title}" to ${to.join(", ")} (Gmail messageId: ${messageId})`
  );
}
