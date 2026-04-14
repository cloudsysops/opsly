import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail({
  email,
  company_name,
  tenant_slug,
  dashboard_url,
  request_id,
}: {
  email: string;
  company_name: string;
  tenant_slug: string;
  dashboard_url: string;
  request_id: string;
}) {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'hello@opsly.sh',
      to: email,
      subject: `Welcome to Opsly: Your trial is ready`,
      html: `
        <h1>Welcome to Opsly, ${company_name}!</h1>
        <p>Your 14-day trial of the Business plan is ready to go.</p>

        <h2>What's next?</h2>
        <ol>
          <li><a href="${dashboard_url}">Access your dashboard</a></li>
          <li>Deploy your first customer automation</li>
          <li>Watch uptime monitoring in action</li>
          <li>Set up billing for your customers</li>
        </ol>

        <p><a href="${dashboard_url}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a></p>

        <p>Questions? Reply to this email or join our <a href="https://slack.opsly.sh">support Slack</a>.</p>

        <p style="color: #666; font-size: 12px;">Tenant: ${tenant_slug} | Request ID: ${request_id}</p>
      `,
    });

    return result;
  } catch (error) {
    throw new Error(
      `Failed to send welcome email: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}
