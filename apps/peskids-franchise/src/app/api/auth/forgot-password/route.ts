import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import { passwordResetEmail } from "@/lib/email/templates";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Find prospect by email
    const prospect = await db.prospect.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!prospect) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update prospect with reset token
    await db.prospect.update({
      where: { id: prospect.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    const emailContent = passwordResetEmail({
      firstName: prospect.firstName,
      resetToken,
    });

    await sendEmail({
      to: prospect.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "EMAIL_SENT",
        description: "Password reset email requested",
      },
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link has been sent",
    });
  } catch (error) {
    console.error("Error sending reset email:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
