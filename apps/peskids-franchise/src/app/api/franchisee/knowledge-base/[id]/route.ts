import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prospect = await db.prospect.findUnique({
      where: { email: session.user.email },
      include: { franchiseeAccount: true },
    });

    if (!prospect || prospect.pipelineStage !== "SELECTED") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Determine if looking up by id or slug
    const lookupValue = params.id;
    const isSlug = !/^c[a-z0-9]{24}$/.test(lookupValue);

    const article = await db.knowledgeDocument.findFirst({
      where: {
        ...(isSlug ? { slug: lookupValue } : { id: lookupValue }),
        isPublic: true,
        scope: { in: ["ACADEMY", "BOTH"] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        articleType: true,
        content: true,
        excerpt: true,
        sopVersion: true,
        sopOwner: true,
        sopRequired: true,
        authorName: true,
        authorImage: true,
        updatedAt: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get related articles (same category, exclude current)
    const related = await db.knowledgeDocument.findMany({
      where: {
        category: article.category,
        id: { not: article.id },
        isPublic: true,
        scope: { in: ["ACADEMY", "BOTH"] },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
      },
      take: 3,
    });

    // Backlinks — articles that link TO this article
    const backlinks = await db.wikiLink.findMany({
      where: { toId: article.id },
      select: {
        from: {
          select: { id: true, title: true, slug: true, category: true },
        },
      },
    });

    return NextResponse.json({
      article,
      related,
      backlinks: backlinks.map((bl) => bl.from),
    });
  } catch (error) {
    console.error("Error fetching knowledge base article:", error);
    return NextResponse.json(
      { error: "Failed to fetch article" },
      { status: 500 }
    );
  }
}
