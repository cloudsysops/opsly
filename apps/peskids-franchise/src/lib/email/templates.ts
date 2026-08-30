// Email templates for franchise notifications

// Brand colors from website
const BRAND = {
  navy: '#2D2F8E',
  purple: '#6A469D',
  cyan: '#50C8DF',
  green: '#34B256',
  yellow: '#FACC29',
  orange: '#F79A30',
  light: '#E8FBFF',
};

// Logo URL (absolute URL for email clients)
const LOGO_URL = 'https://via.placeholder.com/180x60?text=Acme+Franchise';
const BASE_URL = 'https://franchise-stc-993771038de6.herokuapp.com';

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #333;
`;

const buttonStyles = `
  display: inline-block;
  background-color: ${BRAND.navy};
  color: white;
  padding: 14px 28px;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
`;

const secondaryButtonStyles = `
  display: inline-block;
  background-color: ${BRAND.cyan};
  color: white;
  padding: 14px 28px;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
`;

function wrapInTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<meta name="x-apple-data-detectors" content="none">` : ""}
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.light};">
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.light}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(45,47,142,0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.purple} 100%); padding: 32px; text-align: center;">
              <img src="${LOGO_URL}" alt="Acme Franchise" width="180" style="display: block; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; ${baseStyles}">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.purple} 100%); padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; color: white; font-weight: 600;">
                Acme Franchise Franchising
              </p>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.8);">
                <a href="mailto:franchising@acmefranchise.com" style="color: ${BRAND.cyan}; text-decoration: none;">franchising@acmefranchise.com</a>
              </p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="margin: 0; font-size: 11px; color: rgba(255,255,255,0.6);">
                  © ${new Date().getFullYear()} Acme Franchise. All rights reserved.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// Admin notification: New inquiry received
export function newInquiryAdminEmail(prospect: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  preferredTerritory?: string | null;
  interestLevel: string;
  aboutYourself?: string | null;
}): { subject: string; html: string } {
  const interestLabels: Record<string, string> = {
    READY_TO_START: "Ready to Start",
    ACTIVELY_SEEKING_FUNDING: "Seeking Funding",
    SERIOUSLY_CONSIDERING: "Seriously Considering",
    JUST_EXPLORING: "Just Exploring",
    GATHERING_INFORMATION: "Gathering Info",
  };

  const content = `
    <h2 style="margin: 0 0 20px; color: #2D2F8E; font-size: 20px;">New Franchise Inquiry</h2>
    <p>A new prospect has submitted an inquiry form:</p>

    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 140px;">Name</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.firstName} ${prospect.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Email</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${prospect.email}" style="color: #6A469D;">${prospect.email}</a></td>
      </tr>
      ${prospect.phone ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Phone</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.phone}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Territory</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.preferredTerritory || "Not specified"}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Interest Level</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${interestLabels[prospect.interestLevel] || prospect.interestLevel}</td>
      </tr>
    </table>

    ${prospect.aboutYourself ? `
    <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: 600;">About Themselves:</p>
      <p style="margin: 0; color: #4b5563;">${prospect.aboutYourself}</p>
    </div>
    ` : ""}

    <p style="margin-top: 24px;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/admin/prospects" style="${buttonStyles}">View in CRM</a>
    </p>
  `;

  return {
    subject: `New Inquiry: ${prospect.firstName} ${prospect.lastName} (${prospect.preferredTerritory || "No territory"})`,
    html: wrapInTemplate(content, "A new prospect has submitted a franchise inquiry."),
  };
}

// Prospect notification: Welcome email
export function welcomeProspectEmail(prospect: {
  firstName: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 8px; color: ${BRAND.navy}; font-size: 28px; font-weight: 700;">Welcome, ${prospect.firstName}!</h2>
    <p style="margin: 0 0 24px; color: ${BRAND.purple}; font-size: 16px;">Your franchise journey begins here</p>

    <p style="font-size: 16px; color: #374151;">Thank you for your interest in becoming an Acme Franchise partner! We're excited to learn more about you and explore whether this opportunity is the right fit.</p>

    <div style="background: linear-gradient(135deg, ${BRAND.light} 0%, #fff 100%); padding: 24px; border-radius: 12px; margin: 28px 0; border-left: 4px solid ${BRAND.cyan};">
      <p style="margin: 0 0 8px; font-weight: 700; color: ${BRAND.navy}; font-size: 16px;">What happens next?</p>
      <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">Our team will review your inquiry and reach out within <strong>24-48 hours</strong> to schedule a discovery call. This is your opportunity to learn more about the franchise and ask questions.</p>
    </div>

    <p style="font-size: 16px; color: #374151; margin-bottom: 12px;">In the meantime, explore what makes us different:</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px; margin-bottom: 8px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 32px; vertical-align: top;">
                <div style="width: 24px; height: 24px; background-color: ${BRAND.yellow}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px;">✓</div>
              </td>
              <td style="color: #374151; font-size: 15px;">Our unique <strong>story-based approach</strong> to chess education</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 32px; vertical-align: top;">
                <div style="width: 24px; height: 24px; background-color: ${BRAND.orange}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px;">✓</div>
              </td>
              <td style="color: #374151; font-size: 15px;">The <strong>proven business model</strong> behind Acme Franchise</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height: 8px;"></td></tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #fafafa; border-radius: 8px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="width: 32px; vertical-align: top;">
                <div style="width: 24px; height: 24px; background-color: ${BRAND.green}; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px;">✓</div>
              </td>
              <td style="color: #374151; font-size: 15px;">What <strong>franchisees can expect</strong> from our partnership</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size: 16px; color: #374151;">We look forward to connecting soon!</p>

    <p style="margin: 32px 0; text-align: center;">
      <a href="${BASE_URL}/business-model" style="${buttonStyles}">Explore the Opportunity</a>
    </p>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 14px;">
        Best regards,<br>
        <strong style="color: ${BRAND.navy};">The Acme Franchise Team</strong>
      </p>
    </div>
  `;

  return {
    subject: "Welcome to Acme Franchise - Your Franchise Journey Begins!",
    html: wrapInTemplate(content, "Thank you for your interest in Acme Franchise franchising."),
  };
}

// Admin notification: Pre-work completed
export function preWorkCompleteAdminEmail(prospect: {
  firstName: string;
  lastName: string;
  email: string;
  preferredTerritory?: string | null;
  prospectId: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 20px; color: #34B256; font-size: 20px;">Pre-Work Completed!</h2>
    <p>Great news! A prospect has completed all pre-work modules:</p>

    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 140px;">Name</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.firstName} ${prospect.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Email</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${prospect.email}" style="color: #6A469D;">${prospect.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Territory</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.preferredTerritory || "Not specified"}</td>
      </tr>
    </table>

    <div style="background-color: #DCFCE7; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #166534;">All 5 pre-work modules have been submitted and are ready for review.</p>
    </div>

    <p style="margin-top: 24px;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/admin/prospects/${prospect.prospectId}" style="${buttonStyles}">Review Submissions</a>
    </p>
  `;

  return {
    subject: `Pre-Work Complete: ${prospect.firstName} ${prospect.lastName} - Ready for Review`,
    html: wrapInTemplate(content, "A prospect has completed all pre-work modules."),
  };
}

// Prospect notification: Pre-work confirmation
export function preWorkConfirmationEmail(prospect: {
  firstName: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 20px; color: #34B256; font-size: 20px;">Congratulations!</h2>
    <p>Hi ${prospect.firstName},</p>
    <p>You've successfully submitted all five pre-work modules. This is a significant milestone in your franchise journey!</p>

    <div style="background-color: #DCFCE7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #34B256;">
      <p style="margin: 0; font-weight: 600; color: #166534;">What happens next?</p>
      <p style="margin: 8px 0 0; color: #4b5563;">Our team will review your submissions. We evaluate the quality of your work, your market research, your outreach efforts, and your 90-day plan. You'll hear from us within 5-7 business days.</p>
    </div>

    <p><strong>Completed Modules:</strong></p>
    <ul style="color: #166534;">
      <li>Territory Builder</li>
      <li>Market Research</li>
      <li>School Outreach Tracker</li>
      <li>Reflection & Video</li>
      <li>90-Day Launch Plan</li>
    </ul>

    <p>Thank you for the time and effort you've invested. We're excited to review your work!</p>

    <p style="margin-top: 24px;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/portal" style="${buttonStyles}">View Your Portal</a>
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      Best regards,<br>
      The Acme Franchise Team
    </p>
  `;

  return {
    subject: "Pre-Work Complete - Your Submissions Are Under Review",
    html: wrapInTemplate(content, "Congratulations on completing your pre-work modules!"),
  };
}

// Prospect notification: Portal invite email
export function portalInviteEmail(prospect: {
  firstName: string;
  inviteToken: string;
}): { subject: string; html: string } {
  const setPasswordUrl = `https://franchise-stc-993771038de6.herokuapp.com/set-password?token=${prospect.inviteToken}`;

  const content = `
    <h2 style="margin: 0 0 20px; color: #2D2F8E; font-size: 20px;">You're Invited to the Franchise Portal!</h2>
    <p>Hi ${prospect.firstName},</p>
    <p>Great news! After our initial conversation, we'd like to invite you to access the Acme Franchise Portal.</p>

    <div style="background-color: #E8FBFF; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #50C8DF;">
      <p style="margin: 0; font-weight: 600; color: #2D2F8E;">What's in the Portal?</p>
      <p style="margin: 8px 0 0; color: #4b5563;">The portal contains your pre-work modules - five exercises designed to help you explore the franchise opportunity while showing us your skills and commitment. This includes:</p>
      <ul style="margin: 12px 0 0; color: #4b5563;">
        <li>Territory Builder - Define your target market</li>
        <li>Market Research - Research schools and demographics</li>
        <li>School Outreach Tracker - Log 10+ contacts</li>
        <li>Reflection & Video - Document your learnings</li>
        <li>90-Day Launch Plan - Build your action plan</li>
      </ul>
    </div>

    <p>Click the button below to set your password and access the portal:</p>

    <p style="margin-top: 24px; text-align: center;">
      <a href="${setPasswordUrl}" style="${buttonStyles}">Set Your Password</a>
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      This link expires in 72 hours. If you have any questions, please reply to this email.
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      Best regards,<br>
      The Acme Franchise Team
    </p>
  `;

  return {
    subject: "You're Invited to the Acme Franchise Portal",
    html: wrapInTemplate(content, "Access your franchise pre-work portal and begin your journey."),
  };
}

// Prospect notification: Password reset email
export function passwordResetEmail(prospect: {
  firstName: string;
  resetToken: string;
}): { subject: string; html: string } {
  const resetUrl = `https://franchise-stc-993771038de6.herokuapp.com/reset-password?token=${prospect.resetToken}`;

  const content = `
    <h2 style="margin: 0 0 20px; color: #2D2F8E; font-size: 20px;">Reset Your Password</h2>
    <p>Hi ${prospect.firstName},</p>
    <p>We received a request to reset your password for the Acme Franchise Portal.</p>

    <p style="margin-top: 24px; text-align: center;">
      <a href="${resetUrl}" style="${buttonStyles}">Reset Password</a>
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      This link expires in 1 hour. If you didn't request this reset, you can safely ignore this email.
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      Best regards,<br>
      The Acme Franchise Team
    </p>
  `;

  return {
    subject: "Reset Your Acme Franchise Portal Password",
    html: wrapInTemplate(content, "Reset your franchise portal password."),
  };
}

// Franchisee notification: Account info updated
export function accountUpdatedEmail(data: {
  firstName: string;
  changes: string[];
  emailChanged?: boolean;
}): { subject: string; html: string } {
  const changesList = data.changes.map(c => `<li>${c}</li>`).join("");

  const signInNote = data.emailChanged
    ? `
    <div style="background-color: #FEF3C7; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F79A30;">
      <p style="margin: 0; font-weight: 600; color: #92400E;">Your login email has changed</p>
      <p style="margin: 8px 0 0; color: #92400E;">Please use this email address to sign in going forward. If you have a @acmefranchise.com email, use the "Sign in with Google" button on the login page.</p>
    </div>
    `
    : "";

  const content = `
    <h2 style="margin: 0 0 20px; color: #2D2F8E; font-size: 20px;">Your Account Has Been Updated</h2>
    <p>Hi ${data.firstName},</p>
    <p>Your franchise account information has been updated:</p>

    <ul style="margin: 16px 0; color: #4b5563;">
      ${changesList}
    </ul>

    ${signInNote}

    <p style="margin-top: 24px; text-align: center;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/login" style="${buttonStyles}">Sign In to Portal</a>
    </p>

    <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
      If you didn't expect this change, please contact us immediately by replying to this email.
    </p>

    <p style="margin-top: 16px; color: #6b7280; font-size: 14px;">
      Best regards,<br>
      The Acme Franchise Team
    </p>
  `;

  return {
    subject: "Your Franchise Account Has Been Updated",
    html: wrapInTemplate(content, "Your franchise account information has been updated."),
  };
}

// Admin notification: High-score prospect alert
export function highScoreProspectEmail(prospect: {
  firstName: string;
  lastName: string;
  email: string;
  preferredTerritory?: string | null;
  prospectScore: number;
  prospectId: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="margin: 0 0 20px; color: #F79A30; font-size: 20px;">High-Score Prospect Alert</h2>
    <p>A prospect has reached a high qualification score:</p>

    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; background: linear-gradient(135deg, #F79A30 0%, #FACC29 100%); color: white; font-size: 48px; font-weight: bold; width: 100px; height: 100px; line-height: 100px; border-radius: 50%;">
        ${prospect.prospectScore}
      </div>
      <p style="margin: 12px 0 0; font-weight: 600; color: #2D2F8E;">Prospect Score</p>
    </div>

    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600; width: 140px;">Name</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.firstName} ${prospect.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Email</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><a href="mailto:${prospect.email}" style="color: #6A469D;">${prospect.email}</a></td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">Territory</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${prospect.preferredTerritory || "Not specified"}</td>
      </tr>
    </table>

    <p>This prospect may be a strong candidate for the franchise program.</p>

    <p style="margin-top: 24px;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/admin/prospects/${prospect.prospectId}" style="${buttonStyles}">View Profile</a>
    </p>
  `;

  return {
    subject: `High-Score Prospect: ${prospect.firstName} ${prospect.lastName} (Score: ${prospect.prospectScore})`,
    html: wrapInTemplate(content, "A prospect has reached a high qualification score."),
  };
}
