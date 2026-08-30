import { db } from "@/lib/db";
import { generateEmbedding } from "./embeddings";

export interface RetrievedChunk {
  id: string;
  content: string;
  documentTitle: string;
  category: string;
  score: number;
}

export type ScopeFilter = "public" | "academy" | "all";

/**
 * Retrieve relevant knowledge chunks based on query similarity
 * @param query - The user's question/query
 * @param topK - Number of top results to return
 * @param threshold - Minimum similarity score (0-1)
 * @param scope - Filter by scope: "public" (website), "academy" (franchisees), or "all"
 */
export async function retrieveRelevantChunks(
  query: string,
  topK: number = 5,
  threshold: number = 0.7,
  scope: ScopeFilter = "public"
): Promise<RetrievedChunk[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Convert to PostgreSQL vector string format: [0.1,0.2,0.3,...]
    const vectorString = `[${queryEmbedding.join(",")}]`;

    // Build scope filter values
    let scopeValues: string[];
    if (scope === "public") {
      // Public website - only PUBLIC and BOTH scopes
      scopeValues = ["PUBLIC", "BOTH"];
    } else if (scope === "academy") {
      // Academy - only ACADEMY and BOTH scopes (more exclusive content)
      scopeValues = ["ACADEMY", "BOTH"];
    } else {
      // All scopes
      scopeValues = ["PUBLIC", "ACADEMY", "BOTH"];
    }

    // Use raw SQL for vector similarity search
    // pgvector uses <=> operator for cosine distance
    const results = await db.$queryRaw<
      Array<{
        id: string;
        content: string;
        documentTitle: string;
        category: string;
        similarity: number;
      }>
    >`
      SELECT
        kc.id,
        kc.content,
        kd.title as "documentTitle",
        kd.category,
        1 - (kc.embedding <=> ${vectorString}::vector) as similarity
      FROM "KnowledgeChunk" kc
      JOIN "KnowledgeDocument" kd ON kc."documentId" = kd.id
      WHERE kd."isPublic" = true
      AND kd.scope::text = ANY(${scopeValues})
      AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> ${vectorString}::vector
      LIMIT ${topK}
    `;

    // Filter by threshold and map to our interface
    return results
      .filter((r) => r.similarity >= threshold)
      .map((r) => ({
        id: r.id,
        content: r.content,
        documentTitle: r.documentTitle,
        category: r.category,
        score: r.similarity,
      }));
  } catch (error) {
    // Safe error logging - avoid Node inspect issues with Prisma errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error retrieving chunks:", errorMessage);
    // Fall back to keyword search if vector search fails
    return keywordSearch(query, topK, scope);
  }
}

async function keywordSearch(
  query: string,
  topK: number,
  scope: ScopeFilter = "public"
): Promise<RetrievedChunk[]> {
  // Simple keyword-based fallback search
  const keywords = query.toLowerCase().split(/\s+/);

  // For now, just filter by isPublic until schema is updated
  // After running `prisma db push`, scope filtering will work via raw SQL
  const chunks = await db.knowledgeChunk.findMany({
    where: {
      OR: keywords.map((keyword) => ({
        content: {
          contains: keyword,
          mode: "insensitive" as const,
        },
      })),
      document: {
        isPublic: true,
      },
    },
    include: {
      document: {
        select: {
          title: true,
          category: true,
        },
      },
    },
    take: topK,
  });

  return chunks.map((chunk) => ({
    id: chunk.id,
    content: chunk.content,
    documentTitle: chunk.document.title,
    category: chunk.document.category,
    score: 0.5, // Default score for keyword matches
  }));
}

export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant information found.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `[Source ${index + 1}: ${chunk.documentTitle}]\n${chunk.content}`
    )
    .join("\n\n---\n\n");
}
