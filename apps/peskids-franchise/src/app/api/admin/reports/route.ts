import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReportType, ChartType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET all custom reports
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await db.customReport.findMany({
      include: {
        schedules: true,
      },
      orderBy: [
        { isSystem: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

// POST create new custom report
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, description, reportType, dataSource, chartType, isPublic } = body;

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check for duplicate slug
    const existing = await db.customReport.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A report with this name already exists" },
        { status: 400 }
      );
    }

    const report = await db.customReport.create({
      data: {
        name,
        slug,
        description: description || null,
        reportType: reportType as ReportType,
        dataSource,
        chartType: chartType ? (chartType as ChartType) : null,
        isSystem: false,
        isPublic: isPublic || false,
        createdBy: session.user.email || "unknown",
        metrics: [],
        dimensions: [],
        filters: [],
      },
      include: {
        schedules: true,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "Failed to create report" }, { status: 500 });
  }
}
