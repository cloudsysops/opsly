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
    const leadSource = await db.leadSource.findUnique({
      where: { id },
      include: { spends: { orderBy: [{ year: "desc" }, { month: "desc" }] } },
    });

    if (!leadSource) {
      return NextResponse.json({ error: "Lead source not found" }, { status: 404 });
    }

    return NextResponse.json({ leadSource });
  } catch (error) {
    console.error("Failed to fetch lead source:", error);
    return NextResponse.json({ error: "Failed to fetch lead source" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { name, category, utmSource, utmMedium, notes, isActive } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (category !== undefined) data.category = category;
    if (utmSource !== undefined) data.utmSource = utmSource || null;
    if (utmMedium !== undefined) data.utmMedium = utmMedium || null;
    if (notes !== undefined) data.notes = notes || null;
    if (isActive !== undefined) data.isActive = isActive;

    const leadSource = await db.leadSource.update({
      where: { id },
      data,
    });

    return NextResponse.json({ leadSource });
  } catch (error) {
    console.error("Failed to update lead source:", error);
    return NextResponse.json({ error: "Failed to update lead source" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await db.leadSource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lead source:", error);
    return NextResponse.json({ error: "Failed to delete lead source" }, { status: 500 });
  }
}
