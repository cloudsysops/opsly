import { jsonError, tryRoute } from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';
import { requireAdminAccess } from '../../../../lib/auth';

/**
 * Personalized outreach email template for agencias-digitales tier-1 targets.
 * Generates subject and body based on contact specialization and company details.
 */

interface OutreachRequest {
  name: string;
  email: string;
  company: string;
  specialization: string;
  company_size?: string;
  revenue_range?: string;
  template_version?: string;
}

interface OutreachEmailResponse {
  recipient: string;
  subject: string;
  body: string;
  html: string;
  template_version: string;
  personalization_fields: string[];
  demo_link: string;
}

/**
 * GET /api/growth/outreach-template?name=X&email=Y&specialization=Z
 *
 * Generate personalized outreach email for given contact.
 * Requires admin access.
 */
export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/growth/outreach-template', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    const email = url.searchParams.get('email');
    const specialization = url.searchParams.get('specialization') || 'workflows';
    const company = url.searchParams.get('company') || 'your company';
    const templateVersion = url.searchParams.get('template_version') || '1.0';

    if (!name || !email) {
      return jsonError('Missing required: name, email', HTTP_STATUS.BAD_REQUEST);
    }

    const result = generateOutreachEmail({
      name,
      email,
      company,
      specialization,
      template_version: templateVersion,
    });

    return Response.json(result, { status: HTTP_STATUS.OK });
  });
}

/**
 * POST /api/growth/outreach-template
 *
 * Generate personalized outreach email from JSON body.
 * Requires admin access.
 */
export async function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/growth/outreach-template', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) return authError;

    const body = (await request.json()) as OutreachRequest;

    const { name, email, company, specialization, template_version } = body;

    if (!name || !email) {
      return jsonError('Missing required: name, email', HTTP_STATUS.BAD_REQUEST);
    }

    const result = generateOutreachEmail({
      name,
      email,
      company: company || 'your company',
      specialization: specialization || 'workflows',
      template_version: template_version || '1.0',
    });

    return Response.json(result, { status: HTTP_STATUS.OK });
  });
}

function buildPlainTextBody(
  name: string,
  company: string,
  specialization: string,
  demoLink: string
): string {
  return `Hi ${name},

I've been following what ${company} does, and I think Opsly could save your team significant time on ${specialization} workflows.

We work with agencies like yours to automate repetitive tasks—everything from lead qualification to client onboarding. The result? Your team focuses on high-impact work, not manual processes.

Here's what we've seen:
- 40+ hours/month saved per team member
- 70% faster client onboarding
- Fewer manual errors

Would you be open to a 15-min demo? I'd love to show you how Opsly could fit into your workflow.

Demo link: ${demoLink}
(Or reply to this email—happy to work around your schedule)

Best,
Opsly Growth Team`;
}

function buildHtmlHeader(name: string, specialization: string): string {
  return `<div class="header">
      <h1>Hey ${name}! 👋</h1>
      <p>Opsly automates your ${specialization} workflows</p>
    </div>`;
}

function buildHtmlContent(company: string, specialization: string, demoLink: string): string {
  return `<div class="content">
      <p>I've been following what <strong>${company}</strong> does, and I think Opsly could save your team significant time on <strong>${specialization}</strong> workflows.</p>
      <p>We work with agencies like yours to automate repetitive tasks—everything from lead qualification to client onboarding. The result? Your team focuses on high-impact work, not manual processes.</p>
      <div class="benefits">
        <strong>Here's what we've seen:</strong>
        <ul>
          <li>40+ hours/month saved per team member</li>
          <li>70% faster client onboarding</li>
          <li>Fewer manual errors</li>
        </ul>
      </div>
      <p>Would you be open to a 15-min demo? I'd love to show you how Opsly could fit into your workflow.</p>
      <a href="${demoLink}" class="cta-button">Book a Demo →</a>
      <p><em>Or reply to this email—happy to work around your schedule</em></p>
    </div>`;
}

function buildHtmlBody(
  name: string,
  company: string,
  specialization: string,
  demoLink: string
): string {
  const css = `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { margin: 20px 0; }
    .content p { margin: 12px 0; }
    .benefits { background: #f5f5f5; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .benefits ul { margin: 0; padding-left: 20px; }
    .benefits li { margin: 8px 0; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${css}</style>
</head>
<body>
  <div class="container">
    ${buildHtmlHeader(name, specialization)}
    ${buildHtmlContent(company, specialization, demoLink)}
    <div class="footer">
      <p>Best,<br>Opsly Growth Team</p>
      <p><em>Based in the Latin American tech ecosystem</em></p>
    </div>
  </div>
</body>
</html>`;
}

function generateOutreachEmail(request: OutreachRequest): OutreachEmailResponse {
  const { name, email, company, specialization } = request;
  const template_version = request.template_version || '1.0';

  const subject = `Hey ${name}, Opsly automates your ${specialization} workflows`;
  const demoLink = 'https://ops.smiletripcare.com/demo';
  const body = buildPlainTextBody(name, company, specialization, demoLink);
  const html = buildHtmlBody(name, company, specialization, demoLink);

  return {
    recipient: email,
    subject,
    body,
    html,
    template_version,
    personalization_fields: ['name', 'company', 'specialization'],
    demo_link: demoLink,
  };
}
