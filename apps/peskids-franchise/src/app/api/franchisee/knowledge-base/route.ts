import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function stripHtmlForExcerpt(html: string): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 150 ? text.substring(0, 150) + "..." : text;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const articleType = searchParams.get("articleType");

    const where: any = {
      isPublic: true,
      scope: { in: ["ACADEMY", "BOTH"] },
    };

    if (category) {
      where.category = category;
    }

    if (articleType) {
      where.articleType = articleType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const articles = await db.knowledgeDocument.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        articleType: true,
        content: true,
        excerpt: true,
        scope: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const articlesWithExcerpts = articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      category: article.category,
      articleType: article.articleType,
      excerpt: article.excerpt || stripHtmlForExcerpt(article.content),
      scope: article.scope,
      updatedAt: article.updatedAt,
    }));

    return NextResponse.json({ articles: articlesWithExcerpts });
  } catch (error) {
    console.error("Error fetching knowledge base articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}
