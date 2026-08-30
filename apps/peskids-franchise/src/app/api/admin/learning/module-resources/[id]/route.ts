import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { sortOrder, label } = body;

  const resource = await db.moduleResource.update({
    where: { id: params.id },
    data: {
      ...(sortOrder !== undefined && { sortOrder }),
      ...(label !== undefined && { label: label || null }),
    },
  });

  return NextResponse.json({ resource });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.moduleResource.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
