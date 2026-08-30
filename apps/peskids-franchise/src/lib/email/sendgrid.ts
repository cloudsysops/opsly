// Email service using Postmark
// (file kept as sendgrid.ts to avoid changing imports everywhere)
import * as postmark from "postmark";

export interface EmailAttachment {
  Name: string;
  Content: string; // Base64 encoded content
  ContentType: string;
  ContentID?: string | null;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

const FROM_EMAIL = "franchising@acmefranchise.com";
const FROM_NAME = "Acme Franchise Franchising";

let client: postmark.ServerClient | null = null;

function getClient(): postmark.ServerClient | null {
  if (!process.env.POSTMARK_API_KEY) {
    return null;
  }
  if (!client) {
    client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  }
  return client;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const postmarkClient = getClient();

  if (!postmarkClient) {
    console.log("Postmark not configured, skipping email:", options.subject);
    return false;
  }

  try {
    // Handle multiple recipients
    const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

    const emailPayload: postmark.Message = {
      From: `${FROM_NAME} <${FROM_EMAIL}>`,
      To: recipients,
      Subject: options.subject,
      HtmlBody: options.html,
      TextBody: options.text || options.html.replace(/<[^>]*>/g, ""),
      MessageStream: "outbound",
    };

    // Add attachments if provided
    if (options.attachments && options.attachments.length > 0) {
      emailPayload.Attachments = options.attachments.map(att => ({
        Name: att.Name,
        Content: att.Content,
        ContentType: att.ContentType,
        ContentID: att.ContentID || null,
      }));
    }

    await postmarkClient.sendEmail(emailPayload);

    console.log(`Email sent: ${options.subject} to ${recipients}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function sendBulkEmail(
  emails: EmailOptions[]
): Promise<boolean[]> {
  return Promise.all(emails.map(sendEmail));
}
