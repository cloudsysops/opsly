import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripHtml } from "@/lib/knowledge-base/pipeline";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// Stop words to skip when matching titles
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "its", "it", "this", "that",
  "as", "if", "not", "no", "so", "up", "out", "about", "into", "over",
  "after", "your", "our", "how", "what", "when", "where", "who", "which",
]);

interface Suggestion {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleType: string;
  matchType: "title" | "semantic";
  matchDetail: string;
  matchedText: string;
  confidence: number;
}

// GET: Generate link suggestions for an article
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Fetch the article
    const article = await db.knowledgeDocument.findUnique({
      where: { id },
    });

    if (!article) {
      return NextResponse.json({ error: "Article not found" }, { status: 404 });
    }

    // Get plain text content
    const plainText = stripHtml(article.content).toLowerCase();

    // Extract already-linked article IDs from the HTML
    const linkedIds = new Set<string>();
    const linkRegex = /data-wiki-id="([^"]+)"/g;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(article.content)) !== null) {
      linkedIds.add(linkMatch[1]);
    }

    // Fetch all other published articles
    const otherArticles = await db.knowledgeDocument.findMany({
      where: {
        id: { not: id },
        isPublic: true,
        title: { not: { startsWith: "[Manual]" } },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        articleType: true,
      },
    });

    const suggestions: Suggestion[] = [];
    const matchedArticleIds = new Set<string>();

    // ── Tier 1: Title/keyword matching ───────────────────────────────────────

    for (const other of otherArticles) {
      if (linkedIds.has(other.id)) continue;

      // Try full title match first
      const titleLower = other.title.toLowerCase();
      const titleRegex = new RegExp(
        titleLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      const fullMatches = plainText.match(titleRegex);

      if (fullMatches && fullMatches.length > 0) {
        suggestions.push({
          articleId: other.id,
          articleTitle: other.title,
          articleSlug: other.slug,
          articleType: other.articleType || "ARTICLE",
          matchType: "title",
          matchDetail: `"${other.title}" appears ${fullMatches.length} time${fullMatches.length > 1 ? "s" : ""} in your article`,
          matchedText: other.title,
          confidence: Math.min(0.95, 0.7 + fullMatches.length * 0.05),
        });
        matchedArticleIds.add(other.id);
        continue;
      }

      // Try significant keyword phrases (2+ word sequences from the title)
      const titleWords = other.title
        .split(/\s+/)
        .filter((w) => !STOP_WORDS.has(w.toLowerCase()) && w.length > 2);

      if (titleWords.length >= 2) {
        // Try pairs of adjacent significant words
        for (let i = 0; i < titleWords.length - 1; i++) {
          const phrase = `${titleWords[i]} ${titleWords[i + 1]}`.toLowerCase();
          const phraseEscaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const phraseRegex = new RegExp(phraseEscaped, "gi");
          const phraseMatches = plainText.match(phraseRegex);

          if (phraseMatches && phraseMatches.length > 0) {
            suggestions.push({
              articleId: other.id,
              articleTitle: other.title,
              articleSlug: other.slug,
              articleType: other.articleType || "ARTICLE",
              matchType: "title",
              matchDetail: `"${titleWords[i]} ${titleWords[i + 1]}" appears ${phraseMatches.length} time${phraseMatches.length > 1 ? "s" : ""}`,
              matchedText: `${titleWords[i]} ${titleWords[i + 1]}`,
              confidence: Math.min(0.85, 0.5 + phraseMatches.length * 0.05),
            });
            matchedArticleIds.add(other.id);
            break;
          }
        }
      }
    }

    // ── Tier 2: Semantic matching via embeddings ─────────────────────────────

    try {
      // Get this article's chunks
      const articleChunks = await db.knowledgeChunk.findMany({
        where: { documentId: id, embedding: { not: null } },
        select: { embedding: true },
      });

      if (articleChunks.length > 0) {
        // Use the first chunk's embedding as a representative query
        const representativeEmbedding = articleChunks[0].embedding!;
        const vectorString = representativeEmbedding.startsWith("[")
          ? representativeEmbedding
          : `[${representativeEmbedding}]`;

        // Find similar chunks from OTHER documents
        const semanticResults = await db.$queryRaw<
          Array<{
            documentId: string;
            documentTitle: string;
            documentSlug: string;
            articleType: string;
            similarity: number;
            chunkContent: string;
          }>
        >`
          SELECT DISTINCT ON (kd.id)
            kd.id as "documentId",
            kd.title as "documentTitle",
            kd.slug as "documentSlug",
            kd."articleType" as "articleType",
            1 - (kc.embedding <=> ${vectorString}::vector) as similarity,
            kc.content as "chunkContent"
          FROM "KnowledgeChunk" kc
          JOIN "KnowledgeDocument" kd ON kc."documentId" = kd.id
          WHERE kd."isPublic" = true
          AND kd.id != ${id}
          AND kc.embedding IS NOT NULL
          AND kd.title NOT LIKE '[Manual]%'
          ORDER BY kd.id, kc.embedding <=> ${vectorString}::vector
        `;

        // Filter by threshold and exclude already-matched articles
        for (const result of semanticResults) {
          if (
            result.similarity >= 0.82 &&
            !matchedArticleIds.has(result.documentId) &&
            !linkedIds.has(result.documentId)
          ) {
            const pct = Math.round(result.similarity * 100);
            suggestions.push({
              articleId: result.documentId,
              articleTitle: result.documentTitle,
              articleSlug: result.documentSlug,
              articleType: result.articleType || "ARTICLE",
              matchType: "semantic",
              matchDetail: `${pct}% semantic match — similar content detected`,
              matchedText: result.documentTitle,
              confidence: result.similarity * 0.9,
            });
            matchedArticleIds.add(result.documentId);
          }
        }
      }
    } catch (err) {
      // Semantic matching is best-effort — if it fails, title matches still work
      console.error("Semantic matching failed:", err);
    }

    // Sort by confidence descending, cap at 10
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const capped = suggestions.slice(0, 10);

    return NextResponse.json({ suggestions: capped });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate link suggestions" },
      { status: 500 }
    );
  }
}
