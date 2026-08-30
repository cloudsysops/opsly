import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderTemplatePreview } from "@/lib/email/template-renderer";

export const dynamic = "force-dynamic";

// POST render template with sample data for preview
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Allow previewing either from DB template or inline content
    let subject: string;
    let bodyHtml: string;

    if (body.subject && body.bodyHtml) {
      // Preview inline content
      subject = body.subject;
      bodyHtml = body.bodyHtml;
    } else {
      // Preview from template in DB
      const template = await db.emailTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }

      subject = template.subject;
      bodyHtml = template.bodyHtml;
    }

    // Render with sample data
    const renderedSubject = renderTemplatePreview(subject);
    const renderedBody = renderTemplatePreview(bodyHtml);

    return NextResponse.json({
      subject: renderedSubject,
      bodyHtml: renderedBody,
    });
  } catch (error) {
    console.error("Error previewing email template:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
