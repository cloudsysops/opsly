import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const spends = await db.campaignSpend.findMany({
      where: { leadSourceId: id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return NextResponse.json({ spends });
  } catch (error) {
    console.error("Failed to fetch spend records:", error);
    return NextResponse.json({ error: "Failed to fetch spend records" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { month, year, amount, notes } = body;

    if (!month || !year || amount === undefined) {
      return NextResponse.json({ error: "Month, year, and amount are required" }, { status: 400 });
    }

    const spend = await db.campaignSpend.upsert({
      where: {
        leadSourceId_month_year: { leadSourceId: id, month, year },
      },
      update: { amount, notes: notes || null },
      create: {
        leadSourceId: id,
        month,
        year,
        amount,
        notes: notes || null,
      },
    });

    return NextResponse.json({ spend });
  } catch (error) {
    console.error("Failed to save spend record:", error);
    return NextResponse.json({ error: "Failed to save spend record" }, { status: 500 });
  }
}
