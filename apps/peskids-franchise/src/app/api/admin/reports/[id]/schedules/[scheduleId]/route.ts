import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// PATCH update schedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scheduleId } = await params;
    const body = await req.json();

    const schedule = await prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: body,
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Failed to update schedule:", error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}

// DELETE schedule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scheduleId } = await params;

    await prisma.reportSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete schedule:", error);
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
