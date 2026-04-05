import { Resend } from "resend";
import { JSON_PRETTY_PRINT_INDENT } from "../constants";
import type { Tenant } from "../supabase/types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(requireEnv("RESEND_API_KEY"));
  }
  return resendClient;
}

function requireFromAddress(): string {
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const fromAddress = process.env.RESEND_FROM_ADDRESS;
  if (fromEmail && fromEmail.length > 0) {
    return fromEmail;
  }
  if (fromAddress && fromAddress.length > 0) {
    return fromAddress;
  }
  throw new Error(
    "Missing required environment variable: RESEND_FROM_EMAIL or RESEND_FROM_ADDRESS",
  );
}

function servicesSummary(services: Tenant["services"]): string {
  if (services === null || typeof services !== "object" || Array.isArray(services)) {
    return JSON.stringify(services);
  }
  return JSON.stringify(services, null, JSON_PRETTY_PRINT_INDENT);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendWelcomeEmail(
  email: string,
  services: Tenant["services"],
): Promise<void> {
  const resend = getResend();
  const summary = servicesSummary(services);
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to: email,
    subject: "Welcome to Opsly",
    html: `<p>Your workspace is ready.</p><pre style="font-family:monospace">${escapeHtml(
      summary,
    )}</pre>`,
  });
  if (error) {
    throw new Error(error.message);
  }
}
