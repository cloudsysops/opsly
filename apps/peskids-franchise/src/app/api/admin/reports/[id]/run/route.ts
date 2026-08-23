import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { executeReportQuery } from "@/lib/reports/query-engine";
import { generateCSV } from "@/lib/reports/csv-generator";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const report = await db.customReport.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateRange =
      startDate && endDate
        ? { start: new Date(startDate), end: new Date(endDate) }
        : undefined;

    const { rows, columns } = await executeReportQuery(report.dataSource, {
      dateRange,
    });

    const csv = generateCSV(rows, columns);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${report.slug}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to run report:", error);
    return NextResponse.json(
      { error: "Failed to run report" },
      { status: 500 }
    );
  }
}
