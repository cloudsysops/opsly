import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { CallType, CallDirection, CallOutcome } from "@prisma/client";

export const dynamic = "force-dynamic";

const updateCallSchema = z.object({
  callType: z.nativeEnum(CallType).optional(),
  direction: z.nativeEnum(CallDirection).optional(),
  duration: z.number().int().positive().optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  notes: z.string().optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, callId } = await params;
    const body = await request.json();
    const data = updateCallSchema.parse(body);

    // Verify call exists and belongs to this prospect
    const existingCall = await db.crmCall.findFirst({
      where: { id: callId, prospectId: id },
    });

    if (!existingCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const call = await db.crmCall.update({
      where: { id: callId },
      data: {
        ...data,
        scheduledFor: data.scheduledFor === null ? null : data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        completedAt: data.completedAt === null ? null : data.completedAt ? new Date(data.completedAt) : undefined,
      },
    });

    return NextResponse.json({ success: true, call });
  } catch (error) {
    console.error("Error updating call:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, callId } = await params;

    // Verify call exists and belongs to this prospect
    const existingCall = await db.crmCall.findFirst({
      where: { id: callId, prospectId: id },
    });

    if (!existingCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    await db.crmCall.delete({
      where: { id: callId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting call:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
