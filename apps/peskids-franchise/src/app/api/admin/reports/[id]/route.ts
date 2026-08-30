import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const report = await db.customReport.findUnique({
      where: { id },
      include: {
        schedules: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json({ error: "Failed to fetch report" }, { status: 500 });
  }
}

// PATCH update report
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const report = await db.customReport.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 });
  }
}

// DELETE report
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if it's a system report
    const report = await db.customReport.findUnique({ where: { id } });
    if (report?.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system reports" },
        { status: 400 }
      );
    }

    await db.customReport.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json({ error: "Failed to delete report" }, { status: 500 });
  }
}
