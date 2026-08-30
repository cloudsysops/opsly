import { db } from "@/lib/db";
import { generateEmbeddings } from "@/lib/rag/embeddings";

/**
 * Strip HTML tags from content for plain-text embedding chunks.
 * TipTap editor produces HTML content.
 */
export function stripHtml(html: string): string {
  let text = html;

  // Replace heading tags with double newlines
  text = text.replace(/<\/?(h[1-6])[^>]*>/gi, "\n\n");

  // Replace list items with newline + dash
  text = text.replace(/<li[^>]*>/gi, "\n- ");
  text = text.replace(/<\/li>/gi, "");

  // Replace <br> and <br/> with single newline
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Replace block-level closing tags with double newlines
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n\n");
  text = text.replace(/<\/blockquote>/gi, "\n\n");

  // Replace <ul> and <ol> tags
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");

  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  // Normalize whitespace within lines (collapse multiple spaces)
  text = text.replace(/[ \t]+/g, " ");

  // Clean up lines that are just spaces
  text = text.replace(/\n +\n/g, "\n\n");

  // Trim the result
  text = text.trim();

  return text;
}

/**
 * Chunk content and generate embeddings for a KnowledgeDocument.
 * Follows the same pattern as prisma/seed-knowledge.ts:
 * 1. Delete existing chunks for this document
 * 2. Strip HTML tags from content
 * 3. Split by double newlines, filter chunks < 30 chars
 * 4. Generate embeddings via generateEmbeddings() (batch)
 * 5. Create KnowledgeChunk records
 */
export async function chunkAndEmbed(
  documentId: string,
  content: string
): Promise<number> {
  // 1. Delete existing chunks
  await db.knowledgeChunk.deleteMany({ where: { documentId } });

  // 2. Strip HTML and split into chunks
  const plainText = stripHtml(content);
  const paragraphs = plainText
    .split("\n\n")
    .filter((c) => c.trim().length > 30);

  if (paragraphs.length === 0) return 0;

  // 3. Generate embeddings in batch
  const trimmedParagraphs = paragraphs.map((p) => p.trim());

  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(trimmedParagraphs);
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw new Error("Failed to generate embeddings for document chunks");
  }

  // 4. Create chunk records
  for (let i = 0; i < trimmedParagraphs.length; i++) {
    await db.knowledgeChunk.create({
      data: {
        documentId,
        content: trimmedParagraphs[i],
        embedding: JSON.stringify(embeddings[i]),
        tokenCount: Math.ceil(trimmedParagraphs[i].length / 4),
        sequence: i,
      },
    });
  }

  return trimmedParagraphs.length;
}

/**
 * Publish an article: set isPublic = true, generate embeddings
 */
export async function publishArticle(id: string): Promise<number> {
  const doc = await db.knowledgeDocument.findUnique({ where: { id } });
  if (!doc) throw new Error("Document not found");

  await db.knowledgeDocument.update({
    where: { id },
    data: { isPublic: true },
  });

  return chunkAndEmbed(id, doc.content);
}

/**
 * Unpublish an article: set isPublic = false, remove chunks (removes from Earl's knowledge)
 */
export async function unpublishArticle(id: string): Promise<void> {
  await db.knowledgeDocument.update({
    where: { id },
    data: { isPublic: false },
  });

  await db.knowledgeChunk.deleteMany({ where: { documentId: id } });
}

/**
 * Sync a published ManualPage into the RAG knowledge base.
 * Creates/updates a shadow KnowledgeDocument with [Manual] prefix.
 */
export async function syncManualPageToKnowledgeBase(pageId: string): Promise<void> {
  const page = await db.manualPage.findUnique({
    where: { id: pageId },
    include: { section: { select: { title: true } } },
  });

  if (!page || !page.content) return;

  const shadowTitle = `[Manual] ${page.section.title} > ${page.title}`;

  // Find existing shadow doc by title prefix match
  let doc = await db.knowledgeDocument.findFirst({
    where: { title: { startsWith: `[Manual] ` }, AND: { title: { endsWith: `> ${page.title}` } } },
  });

  if (doc) {
    doc = await db.knowledgeDocument.update({
      where: { id: doc.id },
      data: { title: shadowTitle, content: page.content, isPublic: true },
    });
  } else {
    const slug = shadowTitle
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 80) + "-" + Date.now();

    doc = await db.knowledgeDocument.create({
      data: {
        title: shadowTitle,
        content: page.content,
        slug,
        category: "OPERATIONS",
        scope: "ACADEMY",
        isPublic: true,
      },
    });
  }

  await chunkAndEmbed(doc.id, page.content);
  console.log(`[RAG] Synced manual page "${page.title}" → KnowledgeDocument ${doc.id}`);
}

/**
 * Remove a ManualPage's shadow KnowledgeDocument from RAG.
 */
export async function removeManualPageFromKnowledgeBase(pageId: string): Promise<void> {
  const page = await db.manualPage.findUnique({
    where: { id: pageId },
    select: { title: true },
  });

  if (!page) return;

  const doc = await db.knowledgeDocument.findFirst({
    where: { title: { startsWith: "[Manual] " }, AND: { title: { endsWith: `> ${page.title}` } } },
  });

  if (doc) {
    await db.knowledgeChunk.deleteMany({ where: { documentId: doc.id } });
    await db.knowledgeDocument.delete({ where: { id: doc.id } });
    console.log(`[RAG] Removed manual page shadow doc "${doc.title}"`);
  }
}
