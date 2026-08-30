import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/sendgrid";

export const dynamic = "force-dynamic";

// This cron runs daily to check for agreements needing renewal notices
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const results = {
      checked: 0,
      noticesSent: {
        twelveMonth: 0,
        sixMonth: 0,
        threeMonth: 0,
      },
      statusUpdates: 0,
      errors: [] as string[],
      insuranceReminders: {
        checked: 0,
        sent: {
          ninetyDay: 0,
          sixtyDay: 0,
          thirtyDay: 0,
        },
        errors: [] as string[],
      },
    };

    // Get all active agreements
    const agreements = await prisma.franchiseAgreement.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        franchiseeAccount: {
          include: {
            prospect: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        renewals: {
          where: {
            status: {
              notIn: ["COMPLETED", "TERMINATED", "TRANSFERRED", "NON_RENEWAL", "DECLINED"],
            },
          },
        },
      },
    });

    results.checked = agreements.length;

    for (const agreement of agreements) {
      try {
        const endDate = new Date(agreement.endDate);
        const daysUntilExpiry = Math.ceil(
          (endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Skip if there's already an active renewal process
        if (agreement.renewals.length > 0) {
          continue;
        }

        // Check for milestone dates
        const milestones = [
          { days: 365, label: "12-month", key: "twelveMonth" as const },
          { days: 180, label: "6-month", key: "sixMonth" as const },
          { days: 90, label: "3-month", key: "threeMonth" as const },
        ];

        for (const milestone of milestones) {
          // Check if we're within 7 days of the milestone (to avoid missing due to timing)
          if (daysUntilExpiry <= milestone.days && daysUntilExpiry > milestone.days - 7) {
            // Create renewal record
            const renewalCount = await prisma.agreementRenewal.count({
              where: { agreementId: agreement.id },
            });

            const renewal = await prisma.agreementRenewal.create({
              data: {
                agreementId: agreement.id,
                renewalNumber: renewalCount + 1,
                initiatedBy: "SYSTEM",
                notificationSentAt: new Date(),
                responseDeadline: new Date(endDate.getTime() - (agreement.renewalNoticeMonths || 6) * 30 * 24 * 60 * 60 * 1000),
                effectiveDate: endDate,
                newTermYears: agreement.renewalTermYears,
                renewalFee: agreement.renewalFee,
                status: "NOTICE_SENT",
              },
            });

            // Update agreement status
            await prisma.franchiseAgreement.update({
              where: { id: agreement.id },
              data: { status: "RENEWAL_IN_PROGRESS" },
            });

            // Send notification email
            const prospect = agreement.franchiseeAccount.prospect;
            await sendEmail({
              to: prospect.email,
              subject: `Franchise Agreement Renewal Notice - ${milestone.label} reminder`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #2D2F8E;">Franchise Agreement Renewal Notice</h1>
                  <p>Dear ${prospect.firstName},</p>
                  <p>This is your <strong>${milestone.label}</strong> reminder that your Acme Franchise agreement
                  <strong>${agreement.agreementNumber}</strong> is set to expire on
                  <strong>${endDate.toLocaleDateString()}</strong>.</p>

                  <h3>Next Steps</h3>
                  <p>Please review your agreement and indicate your renewal intentions by responding to this email or
                  logging into your franchisee portal.</p>

                  <p>Your options:</p>
                  <ul>
                    <li><strong>Renew</strong> - Continue your franchise for another ${agreement.renewalTermYears} year term</li>
                    <li><strong>Transfer</strong> - Sell your franchise to an approved buyer</li>
                    <li><strong>Non-Renewal</strong> - Allow your agreement to expire</li>
                  </ul>

                  <p>Renewal decisions must be communicated at least ${agreement.renewalNoticeMonths} months before your
                  agreement end date.</p>

                  <p>If you have any questions, please don't hesitate to reach out.</p>

                  <p>Best regards,<br>Acme Franchise Team</p>
                </div>
              `,
            });

            // Send admin notification
            await sendEmail({
              to: "franchising@acmefranchise.com",
              subject: `[Action Required] Renewal Notice Sent - ${prospect.firstName} ${prospect.lastName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Renewal Notice Sent</h2>
                  <p><strong>Franchisee:</strong> ${prospect.firstName} ${prospect.lastName} (${prospect.email})</p>
                  <p><strong>Agreement:</strong> ${agreement.agreementNumber}</p>
                  <p><strong>Expires:</strong> ${endDate.toLocaleDateString()} (${daysUntilExpiry} days)</p>
                  <p><strong>Notice Type:</strong> ${milestone.label} reminder</p>
                  <p><a href="${process.env.NEXTAUTH_URL}/admin/franchisees/agreements/${agreement.id}">View Agreement</a></p>
                </div>
              `,
            });

            results.noticesSent[milestone.key]++;
            results.statusUpdates++;
            break; // Only send one notice per agreement
          }
        }

        // Check for agreements that should be marked as RENEWAL_ELIGIBLE
        if (daysUntilExpiry <= 365 && daysUntilExpiry > 90 && agreement.status === "ACTIVE") {
          await prisma.franchiseAgreement.update({
            where: { id: agreement.id },
            data: { status: "RENEWAL_ELIGIBLE" },
          });
          results.statusUpdates++;
        }

        // Check for expired agreements
        if (daysUntilExpiry <= 0 && agreement.status !== "EXPIRED") {
          await prisma.franchiseAgreement.update({
            where: { id: agreement.id },
            data: { status: "EXPIRED" },
          });
          results.statusUpdates++;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.errors.push(`Agreement ${agreement.id}: ${message}`);
      }
    }

    // ============================================
    // INSURANCE EXPIRY REMINDERS
    // ============================================
    const accountsWithInsurance = await prisma.franchiseeAccount.findMany({
      where: {
        insuranceExpiry: { not: null },
      },
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    results.insuranceReminders.checked = accountsWithInsurance.length;

    const insuranceMilestones = [
      { days: 90, label: "90-day", key: "ninetyDay" as const },
      { days: 60, label: "60-day", key: "sixtyDay" as const },
      { days: 30, label: "30-day", key: "thirtyDay" as const },
    ];

    for (const account of accountsWithInsurance) {
      try {
        const expiryDate = new Date(account.insuranceExpiry!);
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        for (const milestone of insuranceMilestones) {
          // Check if we're within 7 days of the milestone window
          if (daysUntilExpiry <= milestone.days && daysUntilExpiry > milestone.days - 7) {
            const subjectLine = `Insurance Policy Expiring Soon — ${account.prospect.firstName} ${account.prospect.lastName}`;

            // Check if we already sent this milestone reminder (dedup via SentEmail)
            const alreadySent = await prisma.sentEmail.findFirst({
              where: {
                prospectId: account.prospectId,
                subject: subjectLine,
                sentAt: {
                  gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // Within last 30 days
                },
              },
            });

            if (alreadySent) {
              break;
            }

            const carrierLine = account.insuranceCarrier
              ? `<p><strong>Carrier:</strong> ${account.insuranceCarrier}</p>`
              : "";
            const policyLine = account.insurancePolicyNumber
              ? `<p><strong>Policy Number:</strong> ${account.insurancePolicyNumber}</p>`
              : "";

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2D2F8E;">Insurance Policy Expiring Soon</h1>
                <p>Dear ${account.prospect.firstName},</p>
                <p>This is your <strong>${milestone.label}</strong> reminder that your insurance policy is set to expire on
                <strong>${expiryDate.toLocaleDateString()}</strong>.</p>

                ${carrierLine}
                ${policyLine}
                <p><strong>Expiry Date:</strong> ${expiryDate.toLocaleDateString()}</p>

                <h3>Action Required</h3>
                <p>Please renew your insurance policy before the expiry date and upload your updated Certificate of Insurance (COI)
                to your franchisee portal.</p>

                <p>Maintaining active insurance coverage is a requirement of your franchise agreement. Failure to provide
                proof of renewed coverage may result in a compliance issue on your account.</p>

                <p>If you have any questions, please don't hesitate to reach out.</p>

                <p>Best regards,<br>Acme Franchise Team</p>
              </div>
            `;

            // Send to franchisee
            await sendEmail({
              to: account.prospect.email,
              subject: subjectLine,
              html: emailHtml,
            });

            // Send admin notification
            await sendEmail({
              to: "franchising@acmefranchise.com",
              subject: `[Insurance Expiring] ${milestone.label} — ${account.prospect.firstName} ${account.prospect.lastName}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2>Insurance Expiry Reminder Sent</h2>
                  <p><strong>Franchisee:</strong> ${account.prospect.firstName} ${account.prospect.lastName} (${account.prospect.email})</p>
                  ${carrierLine}
                  ${policyLine}
                  <p><strong>Expires:</strong> ${expiryDate.toLocaleDateString()} (${daysUntilExpiry} days)</p>
                  <p><strong>Notice Type:</strong> ${milestone.label} reminder</p>
                  <p><a href="${process.env.NEXTAUTH_URL}/admin/franchisees/${account.id}">View Franchisee</a></p>
                </div>
              `,
            });

            // Record in SentEmail for dedup tracking
            await prisma.sentEmail.create({
              data: {
                prospectId: account.prospectId,
                toEmail: account.prospect.email,
                subject: subjectLine,
                bodyHtml: emailHtml,
                bodyPreview: `${milestone.label} insurance expiry reminder — expires ${expiryDate.toLocaleDateString()}`,
                sentBy: "SYSTEM",
              },
            });

            results.insuranceReminders.sent[milestone.key]++;
            break; // Only send one notice per account
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.insuranceReminders.errors.push(`Account ${account.id}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Renewal reminders cron failed:", error);
    return NextResponse.json(
      { error: "Failed to process renewal reminders" },
      { status: 500 }
    );
  }
}
