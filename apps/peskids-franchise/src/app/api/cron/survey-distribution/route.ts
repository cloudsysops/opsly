import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;
const PORTAL_URL = process.env.NEXTAUTH_URL || "https://franchise-stc-993771038de6.herokuapp.com";

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");

    if (!CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all SELECTED franchisees who were selected 90+ days ago
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const eightyDaysAgo = new Date();
    eightyDaysAgo.setDate(eightyDaysAgo.getDate() - 80);

    const eligibleFranchisees = await db.prospect.findMany({
      where: {
        pipelineStage: "SELECTED",
        selectedAt: { lte: ninetyDaysAgo },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        surveyResponses: {
          where: {
            surveyType: "QUARTERLY",
            createdAt: { gte: eightyDaysAgo },
          },
          select: { id: true },
        },
      },
    });

    // Filter out those who already completed a QUARTERLY survey in last 80 days
    const toNotify = eligibleFranchisees.filter(
      (f) => f.surveyResponses.length === 0
    );

    let emailsSent = 0;

    for (const franchisee of toNotify) {
      const surveyUrl = `${PORTAL_URL}/portal/feedback?type=QUARTERLY`;

      sendEmail({
        to: franchisee.email,
        subject: "Your Quarterly Franchise Portal Feedback",
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2D2F8E; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Quarterly Feedback</h1>
            </div>
            <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Hi ${franchisee.firstName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                We'd love to hear how the franchise portal is working for you.
                Your feedback directly shapes what we build next.
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                The survey takes about 2 minutes.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${surveyUrl}"
                   style="display: inline-block; padding: 14px 32px; background: #2D2F8E; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Take the Survey
                </a>
              </div>
              <p style="color: #9CA3AF; font-size: 14px; text-align: center;">
                Acme Franchise Franchising LLC
              </p>
            </div>
          </div>
        `,
      }).catch(console.error);

      emailsSent++;
    }

    return NextResponse.json({
      success: true,
      eligible: toNotify.length,
      emailsSent,
    });
  } catch (error) {
    console.error("Survey distribution cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
