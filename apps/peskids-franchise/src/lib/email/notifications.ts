import { sendEmail } from "./sendgrid";
import {
  newInquiryAdminEmail,
  welcomeProspectEmail,
  preWorkCompleteAdminEmail,
  preWorkConfirmationEmail,
  highScoreProspectEmail,
} from "./templates";

// Admin email addresses to notify
const ADMIN_EMAILS = [
  "franchising@acmefranchise.com",
  "admin@acmefranchise.com",
];

// High score threshold for alerts
const HIGH_SCORE_THRESHOLD = 75;

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  preferredTerritory?: string | null;
  interestLevel: string;
  aboutYourself?: string | null;
  prospectScore: number;
}

/**
 * Send notifications when a new inquiry is received
 */
export async function notifyNewInquiry(prospect: Prospect): Promise<void> {
  try {
    // Notify admins
    const adminEmail = newInquiryAdminEmail({
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      preferredTerritory: prospect.preferredTerritory,
      interestLevel: prospect.interestLevel,
      aboutYourself: prospect.aboutYourself,
    });

    await sendEmail({
      to: ADMIN_EMAILS,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    // Send welcome email to prospect
    const welcomeEmail = welcomeProspectEmail({
      firstName: prospect.firstName,
    });

    await sendEmail({
      to: prospect.email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    });

    console.log(`New inquiry notifications sent for ${prospect.email}`);
  } catch (error) {
    console.error("Error sending new inquiry notifications:", error);
  }
}

/**
 * Send notifications when pre-work is completed
 */
export async function notifyPreWorkComplete(prospect: Prospect): Promise<void> {
  try {
    // Notify admins
    const adminEmail = preWorkCompleteAdminEmail({
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      preferredTerritory: prospect.preferredTerritory,
      prospectId: prospect.id,
    });

    await sendEmail({
      to: ADMIN_EMAILS,
      subject: adminEmail.subject,
      html: adminEmail.html,
    });

    // Send confirmation to prospect
    const confirmEmail = preWorkConfirmationEmail({
      firstName: prospect.firstName,
    });

    await sendEmail({
      to: prospect.email,
      subject: confirmEmail.subject,
      html: confirmEmail.html,
    });

    console.log(`Pre-work complete notifications sent for ${prospect.email}`);
  } catch (error) {
    console.error("Error sending pre-work complete notifications:", error);
  }
}

/**
 * Send notification when a prospect reaches a high score
 */
export async function notifyHighScoreProspect(
  prospect: Prospect,
  previousScore: number
): Promise<void> {
  // Only notify if crossing the threshold
  if (previousScore >= HIGH_SCORE_THRESHOLD || prospect.prospectScore < HIGH_SCORE_THRESHOLD) {
    return;
  }

  try {
    const email = highScoreProspectEmail({
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      preferredTerritory: prospect.preferredTerritory,
      prospectScore: prospect.prospectScore,
      prospectId: prospect.id,
    });

    await sendEmail({
      to: ADMIN_EMAILS,
      subject: email.subject,
      html: email.html,
    });

    console.log(`High-score notification sent for ${prospect.email}`);
  } catch (error) {
    console.error("Error sending high-score notification:", error);
  }
}

/**
 * Generate daily digest of prospect activity
 */
export interface DailyDigestData {
  newInquiries: number;
  preWorkStarted: number;
  preWorkCompleted: number;
  highScoreProspects: Array<{
    name: string;
    score: number;
    territory: string;
  }>;
  stalePipeline: Array<{
    name: string;
    stage: string;
    daysSinceUpdate: number;
  }>;
  hotProspectAlerts?: Array<{
    type: string;
    subject: string;
    details: Record<string, unknown>;
  }>;
  staleBenchmarks?: Array<{
    companyName: string;
    dataYear: number;
    lastVerifiedAt: string | null;
  }>;
}

export async function sendDailyDigest(data: DailyDigestData): Promise<void> {
  if (
    data.newInquiries === 0 &&
    data.preWorkStarted === 0 &&
    data.preWorkCompleted === 0 &&
    data.highScoreProspects.length === 0 &&
    data.stalePipeline.length === 0 &&
    (!data.hotProspectAlerts || data.hotProspectAlerts.length === 0) &&
    (!data.staleBenchmarks || data.staleBenchmarks.length === 0)
  ) {
    console.log("No activity to report in daily digest");
    return;
  }

  const content = `
    <h2 style="margin: 0 0 20px; color: #2D2F8E; font-size: 20px;">Daily Franchise Pipeline Digest</h2>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0;">
      <div style="text-align: center; padding: 16px; background-color: #E8FBFF; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #2D2F8E;">${data.newInquiries}</div>
        <div style="font-size: 12px; color: #6b7280;">New Inquiries</div>
      </div>
      <div style="text-align: center; padding: 16px; background-color: #FEF3C7; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #2D2F8E;">${data.preWorkStarted}</div>
        <div style="font-size: 12px; color: #6b7280;">Started Pre-Work</div>
      </div>
      <div style="text-align: center; padding: 16px; background-color: #DCFCE7; border-radius: 8px;">
        <div style="font-size: 32px; font-weight: bold; color: #2D2F8E;">${data.preWorkCompleted}</div>
        <div style="font-size: 12px; color: #6b7280;">Completed Pre-Work</div>
      </div>
    </div>

    ${data.highScoreProspects.length > 0 ? `
    <h3 style="margin: 24px 0 12px; color: #F79A30;">High-Score Prospects</h3>
    <ul>
      ${data.highScoreProspects.map((p) => `<li>${p.name} (Score: ${p.score}) - ${p.territory}</li>`).join("")}
    </ul>
    ` : ""}

    ${data.hotProspectAlerts && data.hotProspectAlerts.length > 0 ? `
    <h3 style="margin: 24px 0 12px; color: #F79A30;">🔥 Hot Prospect Alerts (${data.hotProspectAlerts.length})</h3>
    <ul>
      ${data.hotProspectAlerts.map((a) => {
        if (a.type === "repeat_visitor") {
          return `<li><strong>Repeat Visitor</strong> — ${a.details.totalSessions} sessions, ${a.details.totalPageViews} page views, ${Math.round((a.details.totalTimeOnSite as number) / 60)} min on site (first seen ${new Date(a.details.firstSeenAt as string).toLocaleDateString()})</li>`;
        } else if (a.type === "high_engagement") {
          return `<li><strong>High Engagement</strong> — ${a.details.pageViews} pages viewed, chatted with Earl, ${Math.round((a.details.sessionDuration as number) / 60)} min session</li>`;
        } else if (a.type === "new_territory") {
          return `<li><strong>New Territory</strong> — First visitor from ${a.details.city}, ${a.details.region}</li>`;
        }
        return `<li>${a.subject}</li>`;
      }).join("")}
    </ul>
    ` : ""}

    ${data.stalePipeline.length > 0 ? `
    <h3 style="margin: 24px 0 12px; color: #EF4444;">Attention Needed</h3>
    <p>These prospects haven't had activity in a while:</p>
    <ul>
      ${data.stalePipeline.map((p) => `<li>${p.name} - ${p.stage} (${p.daysSinceUpdate} days)</li>`).join("")}
    </ul>
    ` : ""}

    ${data.staleBenchmarks && data.staleBenchmarks.length > 0 ? `
    <h3 style="margin: 24px 0 12px; color: #F79A30;">Benchmark Data Needs Refreshing</h3>
    <p style="font-size: 14px; color: #6b7280;">${data.staleBenchmarks.length} industry benchmark(s) may have outdated data:</p>
    <ul>
      ${data.staleBenchmarks.map((b) =>
        `<li>${b.companyName} (Data Year: ${b.dataYear}${b.lastVerifiedAt ? `, Last Verified: ${new Date(b.lastVerifiedAt).toLocaleDateString()}` : ', Never Verified'})</li>`
      ).join("")}
    </ul>
    ` : ""}

    <p style="margin-top: 24px;">
      <a href="https://franchise-stc-993771038de6.herokuapp.com/admin" style="display: inline-block; background-color: #2D2F8E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard</a>
    </p>
  `;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #2D2F8E 0%, #6A469D 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px;">Acme Franchise</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  await sendEmail({
    to: ADMIN_EMAILS,
    subject: `Franchise Pipeline Daily Digest - ${new Date().toLocaleDateString()}`,
    html,
  });
}
