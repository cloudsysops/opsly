import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmailTemplateCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET all email templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const templates = await db.emailTemplate.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        subject: true,
        variables: true,
        isSystem: true,
        isActive: true,
        defaultTo: true,
        defaultCc: true,
        defaultFrom: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { sentEmails: true },
        },
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST create new template
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { slug, name, description, category, subject, bodyHtml, variables } = body;

    // Validate required fields
    if (!slug || !name || !category || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db.emailTemplate.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A template with this slug already exists" },
        { status: 409 }
      );
    }

    // Validate category
    if (!Object.values(EmailTemplateCategory).includes(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    const template = await db.emailTemplate.create({
      data: {
        slug,
        name,
        description: description || null,
        category,
        subject,
        bodyHtml,
        variables: variables || [],
        isSystem: false, // User-created templates are never system templates
        isActive: true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating email template:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
