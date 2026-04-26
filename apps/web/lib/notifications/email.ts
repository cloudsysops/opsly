import { Resend } from 'resend';
import type { Tenant } from '../supabase/types';

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
    resendClient = new Resend(requireEnv('RESEND_API_KEY'));
  }
  return resendClient;
}

function requireFromAddress(): string {
  return requireEnv('RESEND_FROM_EMAIL');
}

function servicesSummary(services: Tenant['services']): string {
  if (services === null || typeof services !== 'object' || Array.isArray(services)) {
    return JSON.stringify(services);
  }
  return JSON.stringify(services, null, 2);
}

export async function sendWelcomeEmail(email: string, services: Tenant['services']): Promise<void> {
  const resend = getResend();
  const summary = servicesSummary(services);
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to: email,
    subject: 'Welcome to Opsly',
    html: `<p>Your workspace is ready.</p><pre style="font-family:monospace">${escapeHtml(
      summary
    )}</pre>`,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendDemoExpiringEmail(email: string, slug: string): Promise<void> {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: requireFromAddress(),
    to: email,
    subject: `Your Opsly demo (${slug}) is expiring soon`,
    html: `<p>Hello,</p><p>Your demo tenant <strong>${escapeHtml(
      slug
    )}</strong> will expire soon. Upgrade to keep your automations running.</p>`,
  });
  if (error) {
    throw new Error(error.message);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
