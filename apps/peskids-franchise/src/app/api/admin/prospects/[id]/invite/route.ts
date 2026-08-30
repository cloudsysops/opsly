import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import { portalInviteEmail } from "@/lib/email/templates";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Get prospect
    const prospect = await db.prospect.findUnique({
      where: { id },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Check if prospect already has portal access
    if (prospect.passwordHash) {
      return NextResponse.json(
        { error: "Prospect already has portal access" },
        { status: 400 }
      );
    }

    // Generate secure invite token
    const inviteToken = crypto.randomUUID();
    const inviteTokenExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Update prospect with token
    await db.prospect.update({
      where: { id },
      data: {
        inviteToken,
        inviteTokenExpiry,
        inviteSentAt: new Date(),
        // Auto-update pipeline stage if still at NEW_INQUIRY
        ...(prospect.pipelineStage === "NEW_INQUIRY" && {
          pipelineStage: "INITIAL_CONTACT",
        }),
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: id,
        activityType: "EMAIL_SENT",
        description: "Portal invite email sent",
        performedBy: session.user.email,
      },
    });

    // Send invite email
    const emailContent = portalInviteEmail({
      firstName: prospect.firstName,
      inviteToken,
    });

    await sendEmail({
      to: prospect.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      message: "Portal invite sent successfully",
      inviteSentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error sending portal invite:", error);
    return NextResponse.json(
      { error: "Failed to send portal invite" },
      { status: 500 }
    );
  }
}
