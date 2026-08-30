import { db } from "@/lib/db";

/**
 * Generate a URL-friendly slug from a title.
 * Ensures uniqueness by appending a numeric suffix if needed.
 */
export async function generateUniqueSlug(
  title: string,
  existingId?: string
): Promise<string> {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);

  if (!base) return `article-${Date.now()}`;

  // Check if this slug is already taken (excluding the current article if editing)
  let slug = base;
  let suffix = 0;

  while (true) {
    const existing = await db.knowledgeDocument.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (existingId && existing.id === existingId)) {
      return slug;
    }

    suffix++;
    slug = `${base}-${suffix}`;
  }
}
