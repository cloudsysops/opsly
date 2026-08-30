import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { publishArticle, unpublishArticle } from "@/lib/knowledge-base/pipeline";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST: Toggle publish status
// If currently published (isPublic=true) -> unpublish (remove chunks)
// If currently draft (isPublic=false) -> publish (chunk + embed)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const article = await db.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    if (article.isPublic) {
      // Currently published -> unpublish
      await unpublishArticle(id);
      return NextResponse.json({ published: false, chunkCount: 0 });
    } else {
      // Currently draft -> publish and generate embeddings
      const chunkCount = await publishArticle(id);
      return NextResponse.json({ published: true, chunkCount });
    }
  } catch (error) {
    console.error("Error toggling publish status:", error);
    return NextResponse.json(
      { error: "An error occurred while toggling publish status" },
      { status: 500 }
    );
  }
}
