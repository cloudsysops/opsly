import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import { accountUpdatedEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

// GET /api/admin/franchisees/[id] - Get franchisee profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get prospect with all related franchisee data
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: {
        franchiseeAccount: {
          include: {
            contacts: {
              orderBy: [
                { isPrimary: "desc" },
                { createdAt: "asc" },
              ],
            },
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 12,
            },
            tcSnapshots: {
              orderBy: [
                { year: "desc" },
                { month: "desc" },
              ],
              take: 12,
            },
            certifications: {
              include: {
                certification: true,
              },
              orderBy: { earnedAt: "desc" },
            },
            royaltyConfig: true,
          },
        },
        academyProgress: {
          include: {
            module: {
              include: {
                phase: {
                  include: {
                    program: { select: { name: true, slug: true } },
                  },
                },
              },
            },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        earnedBadges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json(
        { error: "Prospect is not a selected franchisee" },
        { status: 400 }
      );
    }

    return NextResponse.json({ franchisee: prospect });
  } catch (error) {
    console.error("Error fetching franchisee:", error);
    return NextResponse.json(
      { error: "Failed to fetch franchisee" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/franchisees/[id] - Update franchisee business info
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Find the prospect and franchisee account
    const prospect = await db.prospect.findUnique({
      where: { id },
      include: { franchiseeAccount: true },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Franchisee not found" }, { status: 404 });
    }

    if (!prospect.franchiseeAccount) {
      return NextResponse.json(
        { error: "Franchisee account not found" },
        { status: 400 }
      );
    }

    // Extract fields that go to Prospect vs FranchiseeAccount
    const {
      firstName,
      lastName,
      email,
      phone,
      preferredTerritory,
      // FranchiseeAccount fields
      ein,
      llcName,
      stateOfIncorporation,
      businessAddress,
      bankName,
      bankAccountLast4,
      bankRoutingLast4,
      insurancePolicyNumber,
      insuranceCarrier,
      insuranceExpiry,
      insuranceCoverageType,
      insuranceEffectiveDate,
      insuranceCOIUrl,
      launchDate,
      tcInstanceUrl,
    } = body;

    // Update prospect basic info if provided
    if (firstName || lastName || email || phone !== undefined || preferredTerritory !== undefined) {
      // If email is changing, check for uniqueness
      if (email && email !== prospect.email) {
        const existing = await db.prospect.findUnique({ where: { email } });
        if (existing) {
          return NextResponse.json(
            { error: "A prospect with this email already exists" },
            { status: 400 }
          );
        }
      }

      await db.prospect.update({
        where: { id },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(email && email !== prospect.email && { email, passwordHash: null, inviteToken: null, inviteTokenExpiry: null }),
          ...(phone !== undefined && { phone }),
          ...(preferredTerritory !== undefined && { preferredTerritory }),
        },
      });
    }

    // Update franchisee account
    const updatedAccount = await db.franchiseeAccount.update({
      where: { id: prospect.franchiseeAccount.id },
      data: {
        ...(ein !== undefined && { ein }),
        ...(llcName !== undefined && { llcName }),
        ...(stateOfIncorporation !== undefined && { stateOfIncorporation }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccountLast4 !== undefined && { bankAccountLast4 }),
        ...(bankRoutingLast4 !== undefined && { bankRoutingLast4 }),
        ...(insurancePolicyNumber !== undefined && { insurancePolicyNumber }),
        ...(insuranceCarrier !== undefined && { insuranceCarrier }),
        ...(insuranceExpiry !== undefined && { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }),
        ...(insuranceCoverageType !== undefined && { insuranceCoverageType }),
        ...(insuranceEffectiveDate !== undefined && { insuranceEffectiveDate: insuranceEffectiveDate ? new Date(insuranceEffectiveDate) : null }),
        ...(insuranceCOIUrl !== undefined && { insuranceCOIUrl }),
        ...(launchDate !== undefined && { launchDate: launchDate ? new Date(launchDate) : null }),
        ...(tcInstanceUrl !== undefined && { tcInstanceUrl }),
      },
      include: {
        contacts: true,
      },
    });

    // Build list of what changed for the notification
    const changes: string[] = [];
    const emailChanged = email && email !== prospect.email;
    if (firstName && firstName !== prospect.firstName) changes.push(`Name updated`);
    if (lastName && lastName !== prospect.lastName) changes.push(`Name updated`);
    if (emailChanged) changes.push(`Email changed to ${email}`);
    if (phone !== undefined && phone !== prospect.phone) changes.push(`Phone updated`);
    if (preferredTerritory !== undefined && preferredTerritory !== prospect.preferredTerritory) changes.push(`Territory updated`);
    if (llcName !== undefined) changes.push(`LLC name updated`);
    if (ein !== undefined) changes.push(`EIN updated`);
    if (stateOfIncorporation !== undefined) changes.push(`State of incorporation updated`);
    if (businessAddress !== undefined) changes.push(`Business address updated`);
    if (insuranceCarrier !== undefined || insurancePolicyNumber !== undefined || insuranceExpiry !== undefined) changes.push(`Insurance information updated`);
    if (launchDate !== undefined) changes.push(`Launch date updated`);
    if (tcInstanceUrl !== undefined) changes.push(`TutorCruncher URL updated`);

    // Deduplicate (e.g. firstName + lastName both trigger "Name updated")
    const uniqueChanges = [...new Set(changes)];

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "NOTE_ADDED",
        description: uniqueChanges.length > 0
          ? `Account updated: ${uniqueChanges.join(", ")}`
          : "Franchisee business information updated",
        performedBy: session.user.email || undefined,
      },
    });

    // Send notification email to the franchisee (fire-and-forget)
    if (uniqueChanges.length > 0) {
      const recipientEmail = emailChanged ? email : prospect.email;
      const recipientName = firstName || prospect.firstName;
      const emailContent = accountUpdatedEmail({
        firstName: recipientName,
        changes: uniqueChanges,
        emailChanged: !!emailChanged,
      });
      sendEmail({
        to: recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch(console.error);

      // Log that we sent the notification
      await db.prospectActivity.create({
        data: {
          prospectId: id,
          activityType: "EMAIL_SENT",
          description: `Account update notification sent to ${recipientEmail}`,
          performedBy: "system",
        },
      });
    }

    return NextResponse.json({ franchiseeAccount: updatedAccount });
  } catch (error) {
    console.error("Error updating franchisee:", error);
    return NextResponse.json(
      { error: "Failed to update franchisee" },
      { status: 500 }
    );
  }
}
