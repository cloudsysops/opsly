import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";

export const dynamic = "force-dynamic";

// GET: List all KB articles with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const articleType = searchParams.get("articleType");
    const status = searchParams.get("status"); // "published" | "draft"
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (category) where.category = category;
    if (articleType) where.articleType = articleType;
    if (status === "published") where.isPublic = true;
    if (status === "draft") where.isPublic = false;
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const articles = await db.knowledgeDocument.findMany({
      where,
      include: {
        _count: { select: { chunks: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Error fetching knowledge base articles:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

// POST: Create new article (as draft by default)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, category, articleType, sopVersion, sopOwner, sopRequired } = body;

    if (!title || !content || !category) {
      return NextResponse.json(
        { error: "Title, content, and category are required" },
        { status: 400 }
      );
    }

    // Auto-generate slug and excerpt
    const slug = await generateUniqueSlug(title);
    const excerpt = content
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 200) || null;

    const article = await db.knowledgeDocument.create({
      data: {
        title,
        content,
        category,
        scope: "ACADEMY",
        slug,
        excerpt,
        articleType: articleType || "ARTICLE",
        sopVersion: articleType === "SOP" ? sopVersion || null : null,
        sopOwner: articleType === "SOP" ? sopOwner || null : null,
        sopRequired: articleType === "SOP" ? sopRequired || false : false,
        isPublic: false, // Always create as draft
        authorId: session.user.id,
        authorName: session.user.name || null,
        authorImage: session.user.image || null,
      },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error("Error creating knowledge base article:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
