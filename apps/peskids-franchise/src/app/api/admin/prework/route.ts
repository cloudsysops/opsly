import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/prework - List all pre-work modules with draft status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email?.endsWith("@acmefranchise.com")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modules = await db.preWorkModule.findMany({
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        sequence: true,
        isRequired: true,
        submissionType: true,
        formSchema: true,
        formSchemaVersion: true,
        draftFormSchema: true,
        draftUpdatedAt: true,
        draftUpdatedBy: true,
        _count: {
          select: {
            submissions: true,
            schemaHistory: true,
          },
        },
      },
    });

    // Add computed hasDraft field
    const modulesWithStatus = modules.map((m) => ({
      ...m,
      hasDraft: m.draftFormSchema !== null,
      submissionCount: m._count.submissions,
      versionCount: m._count.schemaHistory,
    }));

    return NextResponse.json(modulesWithStatus);
  } catch (error) {
    console.error("Error fetching pre-work modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules" },
      { status: 500 }
    );
  }
}
