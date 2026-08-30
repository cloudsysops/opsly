import { google, gmail_v1 } from "googleapis";

// Lazy-load googleapis to avoid build-time errors when credentials aren't set
let gmailClients: Map<string, gmail_v1.Gmail> | null = null;
let gmailSendClients: Map<string, gmail_v1.Gmail> | null = null;

/**
 * Get or create a Gmail client for a specific admin email using domain-wide delegation.
 * The service account impersonates the admin user to access their Gmail.
 */
export async function getGmailClient(adminEmail: string): Promise<gmail_v1.Gmail> {
  if (!gmailClients) {
    gmailClients = new Map();
  }

  // Return cached client if exists
  if (gmailClients.has(adminEmail)) {
    return gmailClients.get(adminEmail)!;
  }

  // Get service account credentials from environment
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON JSON");
  }

  // Create JWT auth with domain-wide delegation
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    subject: adminEmail, // Impersonate this user
  });

  const gmail = google.gmail({ version: "v1", auth });
  gmailClients.set(adminEmail, gmail);

  return gmail;
}

/**
 * Get or create a Gmail client with send permission for a specific admin email.
 * Uses a separate client cache from readonly clients to avoid scope conflicts.
 */
export async function getGmailSendClient(adminEmail: string): Promise<gmail_v1.Gmail> {
  if (!gmailSendClients) {
    gmailSendClients = new Map();
  }

  if (gmailSendClients.has(adminEmail)) {
    return gmailSendClients.get(adminEmail)!;
  }

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set");
  }

  let credentials;
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch {
    throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON JSON");
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ],
    subject: adminEmail,
  });

  const gmail = google.gmail({ version: "v1", auth });
  gmailSendClients.set(adminEmail, gmail);

  return gmail;
}

/**
 * Send an email via Gmail using domain-wide delegation.
 * The email appears in the sender's Gmail sent folder.
 */
export async function sendGmail({
  fromEmail,
  to,
  cc,
  subject,
  htmlBody,
}: {
  fromEmail: string;
  to: string[];
  cc?: string[];
  subject: string;
  htmlBody: string;
}): Promise<{ messageId: string }> {
  const gmail = await getGmailSendClient(fromEmail);

  // Build RFC 2822 MIME message
  const messageParts = [
    `From: ${fromEmail}`,
    `To: ${to.join(", ")}`,
    ...(cc && cc.length > 0 ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    htmlBody,
  ];

  const rawMessage = messageParts.join("\r\n");

  // Base64url encode
  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return { messageId: result.data.id || "" };
}

/**
 * Get list of admin emails configured for Gmail sync
 */
export function getAdminEmails(): string[] {
  const emails = process.env.GMAIL_ADMIN_EMAILS;
  if (!emails) {
    return [];
  }
  return emails.split(",").map((e) => e.trim()).filter(Boolean);
}

/**
 * Check if Gmail integration is configured
 */
export function isGmailConfigured(): boolean {
  return !!(
    (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY) &&
    process.env.GMAIL_ADMIN_EMAILS
  );
}
