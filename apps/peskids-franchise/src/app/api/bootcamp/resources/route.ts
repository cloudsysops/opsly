import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if prospect is selected (has access to academy)
    const prospect = await db.prospect.findUnique({
      where: { id: session.user.id },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      // Return only public resources for non-selected prospects
      const resources = await db.academyResource.findMany({
        where: { isPublic: true },
        orderBy: { title: "asc" },
      });
      // Get unique categories from the public resources
      const categories = [...new Set(resources.map(r => r.category))];
      return NextResponse.json({ resources, categories });
    }

    // Return all resources for selected franchisees
    const resources = await db.academyResource.findMany({
      orderBy: { title: "asc" },
    });

    // Group by category
    const grouped = resources.reduce(
      (acc, resource) => {
        const category = resource.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(resource);
        return acc;
      },
      {} as Record<string, typeof resources>
    );

    return NextResponse.json({
      resources,
      grouped,
      categories: Object.keys(grouped),
    });
  } catch (error) {
    console.error("Academy resources error:", error);
    return NextResponse.json(
      { error: "Failed to fetch resources" },
      { status: 500 }
    );
  }
}
