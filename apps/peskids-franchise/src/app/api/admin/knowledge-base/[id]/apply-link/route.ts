import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { insertWikiLink } from "@/lib/knowledge-base/link-inserter";
import { syncWikiLinks } from "@/lib/knowledge-base/link-extractor";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// POST: Apply a single link suggestion to an article
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { targetArticleId, targetSlug, targetTitle, matchedText } = body;

    if (!targetArticleId || !targetSlug || !targetTitle || !matchedText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch current article content
    const article = await db.knowledgeDocument.findUnique({
      where: { id },
      select: { content: true },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Insert the wiki link
    const updatedContent = insertWikiLink(
      article.content,
      matchedText,
      targetArticleId,
      targetSlug,
      targetTitle
    );

    if (!updatedContent) {
      return NextResponse.json(
        { error: "Could not find a valid insertion point for this link" },
        { status: 422 }
      );
    }

    // Save updated content
    await db.knowledgeDocument.update({
      where: { id },
      data: { content: updatedContent },
    });

    // Sync wiki links table
    syncWikiLinks(id, updatedContent).catch(console.error);

    return NextResponse.json({ success: true, content: updatedContent });
  } catch (error) {
    console.error("Error applying link:", error);
    return NextResponse.json(
      { error: "Failed to apply link" },
      { status: 500 }
    );
  }
}
