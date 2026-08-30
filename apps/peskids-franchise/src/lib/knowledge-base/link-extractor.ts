import { db } from "@/lib/db";

/**
 * Parse HTML content for wiki links (elements with data-wiki-id attribute)
 * and sync the WikiLink table accordingly.
 */
export async function syncWikiLinks(
  fromId: string,
  htmlContent: string
): Promise<void> {
  // Extract all data-wiki-id values from the HTML
  const regex = /data-wiki-id="([^"]+)"/g;
  const newTargetIds = new Set<string>();
  let match;

  while ((match = regex.exec(htmlContent)) !== null) {
    const targetId = match[1];
    // Don't create self-links
    if (targetId !== fromId) {
      newTargetIds.add(targetId);
    }
  }

  // Get existing links from this article
  const existingLinks = await db.wikiLink.findMany({
    where: { fromId },
    select: { id: true, toId: true },
  });

  const existingTargetIds = new Set(existingLinks.map((l) => l.toId));

  // Determine adds and removes
  const toAdd = [...newTargetIds].filter((id) => !existingTargetIds.has(id));
  const toRemove = existingLinks.filter((l) => !newTargetIds.has(l.toId));

  // Verify target articles exist before creating links
  if (toAdd.length > 0) {
    const validTargets = await db.knowledgeDocument.findMany({
      where: { id: { in: toAdd } },
      select: { id: true },
    });
    const validIds = new Set(validTargets.map((t) => t.id));

    const createData = toAdd
      .filter((id) => validIds.has(id))
      .map((toId) => ({ fromId, toId }));

    if (createData.length > 0) {
      await db.wikiLink.createMany({ data: createData });
    }
  }

  // Remove stale links
  if (toRemove.length > 0) {
    await db.wikiLink.deleteMany({
      where: { id: { in: toRemove.map((l) => l.id) } },
    });
  }
}
