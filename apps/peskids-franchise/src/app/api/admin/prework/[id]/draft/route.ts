import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FormSchema } from "@/lib/types/form-schema";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/admin/prework/[id]/draft - Save draft schema
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { formSchema } = body as { formSchema: FormSchema };

    if (!formSchema || typeof formSchema !== "object") {
      return NextResponse.json(
        { error: "Invalid form schema" },
        { status: 400 }
      );
    }

    const module = await db.preWorkModule.update({
      where: { id },
      data: {
        draftFormSchema: formSchema as unknown as Prisma.InputJsonValue,
        draftUpdatedAt: new Date(),
        draftUpdatedBy: session.user.email,
      },
    });

    return NextResponse.json({
      success: true,
      draftUpdatedAt: module.draftUpdatedAt,
      draftUpdatedBy: module.draftUpdatedBy,
    });
  } catch (error) {
    console.error("Error saving draft schema:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/prework/[id]/draft - Discard draft
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await db.preWorkModule.update({
      where: { id },
      data: {
        draftFormSchema: Prisma.DbNull,
        draftUpdatedAt: null,
        draftUpdatedBy: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error discarding draft:", error);
    return NextResponse.json(
      { error: "Failed to discard draft" },
      { status: 500 }
    );
  }
}
