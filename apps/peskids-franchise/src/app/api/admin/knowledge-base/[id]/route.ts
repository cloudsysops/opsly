import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { syncWikiLinks } from "@/lib/knowledge-base/link-extractor";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// GET: Single article with chunk count
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const article = await db.knowledgeDocument.findUnique({
      where: { id },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error fetching knowledge base article:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// PATCH: Update article fields
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const existing = await db.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) {
      updateData.title = body.title;
      // Regenerate slug if title changed
      if (body.title !== existing.title) {
        updateData.slug = await generateUniqueSlug(body.title, id);
      }
    }
    if (body.content !== undefined) {
      updateData.content = body.content;
      // Regenerate excerpt
      updateData.excerpt = body.content
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 200) || null;
    }
    if (body.category !== undefined) updateData.category = body.category;
    if (body.scope !== undefined) updateData.scope = body.scope;
    if (body.articleType !== undefined) updateData.articleType = body.articleType;
    if (body.sopVersion !== undefined) updateData.sopVersion = body.sopVersion || null;
    if (body.sopOwner !== undefined) updateData.sopOwner = body.sopOwner || null;
    if (body.sopRequired !== undefined) updateData.sopRequired = body.sopRequired;

    const article = await db.knowledgeDocument.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { chunks: true } },
      },
    });

    // Sync wiki links if content changed
    if (body.content !== undefined) {
      syncWikiLinks(id, body.content).catch(console.error);
    }

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error updating knowledge base article:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// DELETE: Delete article (cascade handles chunks)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const existing = await db.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Article not found" },
        { status: 404 }
      );
    }

    await db.knowledgeDocument.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting knowledge base article:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
