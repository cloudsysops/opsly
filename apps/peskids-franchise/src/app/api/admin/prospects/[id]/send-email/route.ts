import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendgrid";
import { renderTemplate, extractBodyPreview } from "@/lib/email/template-renderer";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: prospectId } = await params;
    const body = await request.json();
    const { templateId, subject, bodyHtml } = body;

    // Validate required fields
    if (!subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    // Get the prospect
    const prospect = await db.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    // Get template info if templateId provided
    let template = null;
    if (templateId) {
      template = await db.emailTemplate.findUnique({
        where: { id: templateId },
      });
    }

    // Render the template with prospect data
    const renderedSubject = renderTemplate(subject, { prospect });
    const renderedBody = renderTemplate(bodyHtml, { prospect });
    const bodyPreview = extractBodyPreview(renderedBody, 200);

    // Send the email
    const sent = await sendEmail({
      to: prospect.email,
      subject: renderedSubject,
      html: renderedBody,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send email. Email service may not be configured." },
        { status: 500 }
      );
    }

    // Log the sent email
    const sentEmail = await db.sentEmail.create({
      data: {
        prospectId: prospect.id,
        templateId: template?.id || null,
        templateSlug: template?.slug || null,
        toEmail: prospect.email,
        subject: renderedSubject,
        bodyHtml: renderedBody,
        bodyPreview,
        sentBy: session.user.email || "unknown",
      },
    });

    // Also log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "EMAIL_SENT",
        description: `Email sent: "${renderedSubject}"`,
        performedBy: session.user.email || "unknown",
        metadata: {
          sentEmailId: sentEmail.id,
          templateSlug: template?.slug || null,
        },
      },
    });

    // Update last contact date
    await db.prospect.update({
      where: { id: prospectId },
      data: { lastContactAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      sentEmailId: sentEmail.id,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
