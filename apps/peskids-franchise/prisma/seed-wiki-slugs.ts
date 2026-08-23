/**
 * Backfill slugs for existing KnowledgeDocument records that don't have one.
 * Run: npx tsx prisma/seed-wiki-slugs.ts
 * For production: DATABASE_URL="<prod_url>" npx tsx prisma/seed-wiki-slugs.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

async function main() {
  console.log("Backfilling slugs for KnowledgeDocument...");

  // Get all articles without slugs (slug is empty string or null-ish)
  const articles = await prisma.knowledgeDocument.findMany({
    select: { id: true, title: true, slug: true },
  });

  const needsSlug = articles.filter((a) => !a.slug || a.slug.trim() === "");
  console.log(`Found ${needsSlug.length} articles needing slugs (of ${articles.length} total)`);

  const usedSlugs = new Set(
    articles.filter((a) => a.slug && a.slug.trim() !== "").map((a) => a.slug)
  );

  let updated = 0;
  for (const article of needsSlug) {
    let slug = generateSlug(article.title);
    if (!slug) slug = `article-${article.id.substring(0, 8)}`;

    // Ensure uniqueness
    let suffix = 0;
    let candidate = slug;
    while (usedSlugs.has(candidate)) {
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
    slug = candidate;
    usedSlugs.add(slug);

    await prisma.knowledgeDocument.update({
      where: { id: article.id },
      data: { slug },
    });

    console.log(`  [${article.id}] "${article.title}" → ${slug}`);
    updated++;
  }

  console.log(`\nDone! Updated ${updated} articles with slugs.`);
}

main()
  .catch((e) => {
    console.error("Error backfilling slugs:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
