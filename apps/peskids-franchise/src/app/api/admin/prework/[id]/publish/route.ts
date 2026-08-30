import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/admin/prework/[id]/publish - Publish draft to live
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const { changeNotes } = body as { changeNotes?: string };

    // Get current module
    const module = await db.preWorkModule.findUnique({
      where: { id },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (!module.draftFormSchema) {
      return NextResponse.json(
        { error: "No draft to publish" },
        { status: 400 }
      );
    }

    const newVersion = module.formSchemaVersion + 1;

    // Use transaction to ensure consistency
    await db.$transaction([
      // Archive current schema to history (if it exists)
      ...(module.formSchema
        ? [
            db.preWorkSchemaVersion.create({
              data: {
                moduleId: id,
                version: module.formSchemaVersion,
                formSchema: module.formSchema as unknown as Prisma.InputJsonValue,
                publishedBy: session.user.email!,
                changeNotes: changeNotes || null,
              },
            }),
          ]
        : []),
      // Publish draft as new live schema
      db.preWorkModule.update({
        where: { id },
        data: {
          formSchema: module.draftFormSchema as unknown as Prisma.InputJsonValue,
          formSchemaVersion: newVersion,
          draftFormSchema: Prisma.DbNull,
          draftUpdatedAt: null,
          draftUpdatedBy: null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      version: newVersion,
      publishedAt: new Date().toISOString(),
      publishedBy: session.user.email,
    });
  } catch (error) {
    console.error("Error publishing schema:", error);
    return NextResponse.json(
      { error: "Failed to publish schema" },
      { status: 500 }
    );
  }
}
