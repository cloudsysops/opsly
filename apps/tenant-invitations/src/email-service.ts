import nodemailer from 'nodemailer';

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendInvitationEmail(data: {
  to: string;
  tenant_name: string;
  contact_name: string;
  invitation_token: string;
  acceptance_url: string;
  expires_at: Date;
}) {
  const { to, tenant_name, contact_name, acceptance_url, expires_at } = data;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; }
      .content { padding: 30px; background: #f9fafb; }
      .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; }
      .footer { color: #666; font-size: 12px; padding-top: 20px; border-top: 1px solid #ddd; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Hermes! 🎉</h1>
        <p>You've been invited to join ${tenant_name}</p>
      </div>

      <div class="content">
        <p>Hi ${contact_name},</p>

        <p>You've been invited to experience <strong>Hermes</strong> — an autonomous agent orchestration platform with advanced AI capabilities.</p>

        <h3>What is Hermes?</h3>
        <ul>
          <li>✅ Multi-agent orchestration (specialized agents for code, QA, security, docs)</li>
          <li>✅ Autonomous task execution (agents handle repetitive work 24/7)</li>
          <li>✅ Advanced LLM integration (Claude, GPT-4, custom models)</li>
          <li>✅ Music & image generation (integrated creative tools)</li>
          <li>✅ Full audit trail (compliance-ready logging)</li>
          <li>✅ Enterprise security (approval gates, secret management)</li>
        </ul>

        <h3>Accept Your Invitation</h3>
        <p>Click the button below to get started:</p>
        <p>
          <a href="${acceptance_url}" class="button">Accept Invitation</a>
        </p>

        <p><small>This invitation expires on ${expires_at.toLocaleDateString()} at ${expires_at.toLocaleTimeString()}</small></p>

        <h3>Next Steps</h3>
        <ol>
          <li>Accept this invitation</li>
          <li>Set up your Hermes workspace</li>
          <li>Configure your AI agents</li>
          <li>Start automating your workflows</li>
        </ol>

        <p>Questions? Contact <a href="mailto:support@hermes.intcloudsysops.com">support@hermes.intcloudsysops.com</a></p>
      </div>

      <div class="footer">
        <p>© 2026 Hermes by intcloudsysops. All rights reserved.</p>
        <p>If you didn't expect this email, please ignore it.</p>
      </div>
    </div>
  </body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hermes.intcloudsysops.com',
      to,
      subject: `Welcome to Hermes! Join ${tenant_name}`,
      html,
    });

    console.log(`✅ Invitation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(data: {
  to: string;
  tenant_name: string;
  contact_name: string;
  dashboard_url: string;
}) {
  const { to, tenant_name, contact_name, dashboard_url } = data;

  const html = `
<!DOCTYPE html>
<html>
  <head>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; }
      .button { background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to Hermes! 🚀</h1>
      </div>

      <div style="padding: 30px; background: #f9fafb;">
        <p>Hi ${contact_name},</p>
        <p>Your Hermes workspace for <strong>${tenant_name}</strong> is ready!</p>

        <h3>Your agents are waiting:</h3>
        <ul>
          <li>🏗️ <strong>Architect</strong> — Design & code review</li>
          <li>👨‍💻 <strong>Developer</strong> — Feature implementation</li>
          <li>🧪 <strong>QA</strong> — Testing & validation</li>
          <li>🔒 <strong>Security</strong> — Vulnerability scanning</li>
          <li>📚 <strong>Docs</strong> — Documentation management</li>
        </ul>

        <p><a href="${dashboard_url}" class="button">Go to Dashboard</a></p>

        <h3>Quick Start</h3>
        <ol>
          <li>Log in to your dashboard</li>
          <li>Configure your API integrations</li>
          <li>Queue your first task to an agent</li>
          <li>Watch Hermes work autonomously!</li>
        </ol>
      </div>
    </div>
  </body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@hermes.intcloudsysops.com',
      to,
      subject: `Welcome to Hermes, ${contact_name}!`,
      html,
    });

    console.log(`✅ Welcome email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}
