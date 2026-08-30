import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const datasets = await db.dataset.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { dataPoints: true } } },
    });

    return NextResponse.json(datasets);
  } catch (error) {
    console.error("Datasets fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch datasets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, columns, rows, territoryMapId } = await request.json();

    if (!name || !columns || !rows) {
      return NextResponse.json(
        { error: "name, columns, and rows are required" },
        { status: 400 }
      );
    }

    const dataset = await db.dataset.create({
      data: {
        name,
        columns: JSON.parse(JSON.stringify(columns)),
        rowCount: rows.length,
        uploadedBy: session.user.email || session.user.id || "unknown",
        territoryMapId: territoryMapId || null,
      },
    });

    // Create data points in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await db.dataPoint.createMany({
        data: batch.map((row: Record<string, unknown>) => ({
          datasetId: dataset.id,
          address: (row.address as string) || null,
          zipCode: (row.zipCode as string) || (row.zip as string) || null,
          lat: row.lat ? Number(row.lat) : null,
          lng: row.lng ? Number(row.lng) : null,
          properties: JSON.parse(JSON.stringify(row)),
        })),
      });
    }

    return NextResponse.json(dataset, { status: 201 });
  } catch (error) {
    console.error("Dataset creation error:", error);
    return NextResponse.json(
      { error: "Failed to create dataset" },
      { status: 500 }
    );
  }
}
