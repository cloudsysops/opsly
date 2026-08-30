import { gmail_v1 } from "googleapis";

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  direction: "INBOUND" | "OUTBOUND";
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  bodyPreview: string;
  bodyHtml: string | null;
  hasAttachments: boolean;
  attachmentNames: string[];
  sentAt: Date;
}

/**
 * Parse an email address string like "John Doe <john@example.com>"
 */
function parseEmailAddress(address: string): { email: string; name: string | null } {
  const match = address.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim().replace(/^"|"$/g, ""), email: match[2].toLowerCase() };
  }
  return { name: null, email: address.toLowerCase().trim() };
}

/**
 * Extract email addresses from a header value (comma-separated)
 */
function parseEmailList(headerValue: string | null | undefined): string[] {
  if (!headerValue) return [];
  return headerValue
    .split(",")
    .map((addr) => parseEmailAddress(addr.trim()).email)
    .filter(Boolean);
}

/**
 * Decode base64url encoded content
 */
function decodeBase64Url(data: string): string {
  // Replace URL-safe chars with standard base64
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Extract plain text body from message parts
 */
function extractBody(
  payload: gmail_v1.Schema$MessagePart
): { text: string; html: string | null } {
  let text = "";
  let html: string | null = null;

  function processPayload(part: gmail_v1.Schema$MessagePart) {
    if (part.body?.data) {
      const content = decodeBase64Url(part.body.data);
      if (part.mimeType === "text/plain") {
        text = content;
      } else if (part.mimeType === "text/html") {
        html = content;
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        processPayload(subPart);
      }
    }
  }

  processPayload(payload);
  return { text, html };
}

/**
 * Extract attachment info from message parts
 */
function extractAttachments(payload: gmail_v1.Schema$MessagePart): string[] {
  const attachments: string[] = [];

  function processPayload(part: gmail_v1.Schema$MessagePart) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push(part.filename);
    }
    if (part.parts) {
      for (const subPart of part.parts) {
        processPayload(subPart);
      }
    }
  }

  processPayload(payload);
  return attachments;
}

/**
 * Parse a Gmail message into our format
 */
export function parseGmailMessage(
  message: gmail_v1.Schema$Message,
  adminEmail: string
): ParsedEmail | null {
  if (!message.id || !message.threadId || !message.payload) {
    return null;
  }

  const headers = message.payload.headers || [];
  const getHeader = (name: string): string | null => {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  };

  const fromHeader = getHeader("From") || "";
  const { email: fromEmail, name: fromName } = parseEmailAddress(fromHeader);
  const toEmails = parseEmailList(getHeader("To"));
  const ccEmails = parseEmailList(getHeader("Cc"));
  const subject = getHeader("Subject") || "(no subject)";

  // Determine direction based on whether admin email is in From
  const adminEmailLower = adminEmail.toLowerCase();
  const direction = fromEmail === adminEmailLower ? "OUTBOUND" : "INBOUND";

  // Extract body
  const { text, html } = extractBody(message.payload);
  const bodyPreview = text.slice(0, 500) || "(no content)";

  // Extract attachments
  const attachmentNames = extractAttachments(message.payload);

  // Parse date
  const dateHeader = getHeader("Date");
  const internalDate = message.internalDate
    ? new Date(parseInt(message.internalDate))
    : new Date();
  const sentAt = dateHeader ? new Date(dateHeader) : internalDate;

  return {
    messageId: message.id,
    threadId: message.threadId,
    direction,
    fromEmail,
    fromName,
    toEmails,
    ccEmails,
    subject,
    bodyPreview,
    bodyHtml: html,
    hasAttachments: attachmentNames.length > 0,
    attachmentNames,
    sentAt,
  };
}

/**
 * Check if an email involves a specific prospect email
 */
export function emailInvolvesProspect(
  email: ParsedEmail,
  prospectEmail: string
): boolean {
  const prospectEmailLower = prospectEmail.toLowerCase();
  return (
    email.fromEmail === prospectEmailLower ||
    email.toEmails.includes(prospectEmailLower) ||
    email.ccEmails.includes(prospectEmailLower)
  );
}
