/**
 * Seed script: Import Operations Manual documents from /docs/om/
 *
 * Reads 5 markdown files exported from Word, converts them to clean HTML
 * with anchor IDs and a clickable table of contents at the top of each page.
 *
 * Usage:
 *   npx tsx prisma/seed-operations-manual.ts
 *   DATABASE_URL="postgres://...?sslmode=require" npx tsx prisma/seed-operations-manual.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TocItem {
  id: string;
  title: string;
  level: number; // 2 = h2 (major), 3 = h3 (sub)
}

interface ConvertResult {
  html: string;
  toc: TocItem[];
}

// ---------------------------------------------------------------------------
// Inline formatting: markdown → HTML
// ---------------------------------------------------------------------------

function processInline(text: string): string {
  // Remove escape chars from Word export (backslash before any non-alphanumeric)
  text = text.replace(/\\([^a-zA-Z0-9])/g, "$1");

  // Strip image references like ![][image1]
  text = text.replace(/!\[\]\[image\d+\]/g, "");

  // Strip empty bold markers
  text = text.replace(/\*\*\s*\*\*/g, "");

  // Convert links [text](url)
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Convert bold **text**  (non-greedy, single line)
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Convert italic *text*  (non-greedy, not preceded/followed by *)
  text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");

  return text.trim();
}

// ---------------------------------------------------------------------------
// Anchor ID helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanAnchorId(raw: string): string {
  return raw
    .replace(/:/g, "")
    .replace(/,/g, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Markdown → HTML converter
// ---------------------------------------------------------------------------

function convertMarkdownToHtml(markdown: string): ConvertResult {
  const toc: TocItem[] = [];
  const out: string[] = [];
  const lines = markdown.split("\n");

  let inList = false;
  let listTag = ""; // "ul" | "ol"
  const paraBuf: string[] = [];
  let pastToc = false; // skip initial TOC links section
  let skippedMainHeading = false;

  // Flush accumulated paragraph buffer
  function flushPara() {
    if (paraBuf.length === 0) return;
    const joined = processInline(paraBuf.join(" "));
    if (joined) out.push(`<p>${joined}</p>`);
    paraBuf.length = 0;
  }

  // Close any open list
  function closeList() {
    if (inList) {
      out.push(`</${listTag}>`);
      inList = false;
      listTag = "";
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // ---- Skip image data refs at end of file ----
    if (/^\[image\d+\]:/.test(line)) continue;

    // ---- Skip initial TOC links (before first # heading) ----
    if (!pastToc) {
      if (line.startsWith("# ")) {
        pastToc = true;
        // fall through to process heading
      } else {
        continue;
      }
    }

    // ---- Headings ----
    if (line.startsWith("#")) {
      const m = line.match(/^(#{1,3})\s+(.*)$/);
      if (!m) continue;

      const hLevel = m[1].length; // 1, 2, or 3
      let rest = m[2].trim();

      // Extract {#anchor-id} if present
      let anchorId = "";
      const anchorMatch = rest.match(/\{#([^}]+)\}\s*$/);
      if (anchorMatch) {
        anchorId = anchorMatch[1];
        rest = rest.substring(0, rest.indexOf("{#")).trim();
      }

      // Strip bold markers
      rest = rest.replace(/^\*\*/, "").replace(/\*\*$/, "").trim();

      // Skip empty headings
      if (!rest) continue;

      // Skip the main # SECTION N heading (becomes page title)
      if (hLevel === 1 && !skippedMainHeading) {
        skippedMainHeading = true;
        continue;
      }

      // Clean / generate anchor
      anchorId = anchorId ? cleanAnchorId(anchorId) : slugify(rest);

      flushPara();
      closeList();

      // Map markdown levels: ## → h2, ### → h3
      const htmlLevel = hLevel;
      out.push(
        `<h${htmlLevel} id="${anchorId}">${processInline(rest)}</h${htmlLevel}>`
      );
      toc.push({ id: anchorId, title: rest, level: htmlLevel });
      continue;
    }

    // ---- Bullet list items ----
    if (/^\*\s+/.test(line)) {
      const content = line.replace(/^\*\s+/, "");
      flushPara();
      if (!inList || listTag !== "ul") {
        closeList();
        out.push("<ul>");
        inList = true;
        listTag = "ul";
      }
      out.push(`<li>${processInline(content)}</li>`);
      continue;
    }

    // ---- Numbered list items ----
    if (/^\d+[.)]\s+/.test(line)) {
      const content = line.replace(/^\d+[.)]\s+/, "");
      flushPara();
      if (!inList || listTag !== "ol") {
        closeList();
        out.push("<ol>");
        inList = true;
        listTag = "ol";
      }
      out.push(`<li>${processInline(content)}</li>`);
      continue;
    }

    // ---- Table rows (Word artifacts — render as styled block) ----
    if (line.startsWith("|") && line.endsWith("|")) {
      if (/^\|\s*[-:]+\s*\|$/.test(line)) continue; // skip separator rows
      const content = line.replace(/^\|\s*/, "").replace(/\s*\|$/, "");
      if (!content.trim()) continue;
      flushPara();
      closeList();
      out.push(
        `<div class="bg-slate-50 border border-slate-200 rounded-lg p-4 my-4 text-sm whitespace-pre-line">${processInline(content)}</div>`
      );
      continue;
    }

    // ---- Blank / artifact lines ----
    if (
      line === "" ||
      line === "---" ||
      line === "** **" ||
      /^\*\*\s*\*\*$/.test(line)
    ) {
      closeList();
      flushPara();
      continue;
    }

    // ---- Regular text → accumulate paragraph ----
    closeList();
    paraBuf.push(line);
  }

  flushPara();
  closeList();

  return { html: out.join("\n"), toc };
}

// ---------------------------------------------------------------------------
// TOC HTML generator — hierarchical, styled outside of prose
// ---------------------------------------------------------------------------

function generateTocHtml(toc: TocItem[]): string {
  if (toc.length === 0) return "";

  const lines: string[] = [];
  lines.push(
    '<div class="not-prose mb-8">',
    '<nav class="bg-slate-50 border border-slate-200 rounded-lg p-6">',
    '<h2 class="text-lg font-semibold text-slate-800 mb-4">In This Section</h2>',
    '<ul class="space-y-2 list-none p-0 m-0">'
  );

  let lastH2Open = false;

  for (let i = 0; i < toc.length; i++) {
    const item = toc[i];
    const next = toc[i + 1];

    if (item.level === 2) {
      // Close previous h2 sub-list if open
      if (lastH2Open) {
        lines.push("</ul>", "</li>");
        lastH2Open = false;
      }

      // Check if next items are h3 children
      const hasChildren = next && next.level === 3;

      if (hasChildren) {
        lines.push(
          "<li>",
          `<a href="#${item.id}" class="font-medium text-indigo-700 hover:text-indigo-900 hover:underline">${item.title}</a>`,
          '<ul class="ml-4 mt-1 space-y-0.5 list-none p-0 m-0">'
        );
        lastH2Open = true;
      } else {
        lines.push(
          "<li>",
          `<a href="#${item.id}" class="font-medium text-indigo-700 hover:text-indigo-900 hover:underline">${item.title}</a>`,
          "</li>"
        );
      }
    } else if (item.level === 3) {
      lines.push(
        `<li><a href="#${item.id}" class="text-sm text-indigo-600 hover:text-indigo-800 hover:underline">${item.title}</a></li>`
      );
    }
  }

  // Close final h2 sub-list if open
  if (lastH2Open) {
    lines.push("</ul>", "</li>");
  }

  lines.push("</ul>", "</nav>", "</div>");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Document definitions
// ---------------------------------------------------------------------------

const DOCUMENTS = [
  {
    file: "Section 1 Introduction Acme Franchise.docx.md",
    title: "Section 1: Introduction",
    slug: "om-section-1-introduction",
    sortOrder: 0,
    excerpt:
      "Welcome to the Acme Franchise franchise family. Covers the history, mission, vision, core values, and foundational principles of the franchise system.",
  },
  {
    file: "Section 2 Establishing the Business Acme Franchise.docx.md",
    title: "Section 2: Establishing the Business",
    slug: "om-section-2-establishing-the-business",
    sortOrder: 1,
    excerpt:
      "Guidelines for establishing your business entity, obtaining licenses and permits, setting up your location, and securing required insurance coverage.",
  },
  {
    file: "Section 3 Personnel Acme Franchise.docx.md",
    title: "Section 3: Personnel",
    slug: "om-section-3-personnel",
    sortOrder: 2,
    excerpt:
      "Best practices for recruiting, interviewing, training, and retaining quality tutors who deliver the Acme Franchise experience.",
  },
  {
    file: "Section 4 Marketing the Business Acme Franchise.docx.md",
    title: "Section 4: Marketing the Business",
    slug: "om-section-4-marketing",
    sortOrder: 3,
    excerpt:
      "Brand standards, marketing strategies, approval processes, and tactics for promoting your Acme Franchise business in your territory.",
  },
  {
    file: "Section 5 Operating Procedures Acme Franchise.docx.md",
    title: "Section 5: Operating Procedures",
    slug: "om-section-5-operating-procedures",
    sortOrder: 4,
    excerpt:
      "Day-to-day operational guidelines including approved programs, booking procedures, lesson delivery, equipment management, safety, and financial matters.",
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding Operations Manual pages...\n");

  // 1. Upsert the ManualSection
  const section = await prisma.manualSection.upsert({
    where: { slug: "franchise-operations-manual" },
    update: {
      title: "Franchise Operations Manual",
      description:
        "Complete operations manual for Acme Franchise franchisees",
      icon: "\uD83D\uDCCB",
    },
    create: {
      title: "Franchise Operations Manual",
      slug: "franchise-operations-manual",
      description:
        "Complete operations manual for Acme Franchise franchisees",
      icon: "\uD83D\uDCCB",
      sortOrder: 0,
    },
  });

  console.log(`  Section: ${section.title} (${section.id})\n`);

  // 2. Process each document
  for (const doc of DOCUMENTS) {
    const mdPath = path.join(__dirname, "..", "docs", "om", doc.file);

    if (!fs.existsSync(mdPath)) {
      console.log(`  SKIP: ${doc.file} (file not found)`);
      continue;
    }

    const markdown = fs.readFileSync(mdPath, "utf-8");
    const { html, toc } = convertMarkdownToHtml(markdown);
    const tocHtml = generateTocHtml(toc);
    const fullContent = tocHtml + "\n" + html;

    // Upsert the ManualPage
    const page = await prisma.manualPage.upsert({
      where: { slug: doc.slug },
      update: {
        title: doc.title,
        content: fullContent,
        excerpt: doc.excerpt,
        sectionId: section.id,
        sortOrder: doc.sortOrder,
      },
      create: {
        title: doc.title,
        slug: doc.slug,
        content: fullContent,
        excerpt: doc.excerpt,
        sectionId: section.id,
        sortOrder: doc.sortOrder,
        status: "PUBLISHED",
        publishedAt: new Date(),
        requiresAcknowledgment: true,
        currentVersion: 1,
      },
    });

    // Upsert the initial ManualPageVersion
    await prisma.manualPageVersion.upsert({
      where: {
        pageId_versionNumber: { pageId: page.id, versionNumber: 1 },
      },
      update: { content: fullContent },
      create: {
        pageId: page.id,
        versionNumber: 1,
        content: fullContent,
        changeType: "MAJOR",
        changeSummary: "Initial import from Operations Manual",
        createdBy: "seed",
      },
    });

    console.log(
      `  \u2713 ${doc.title} — ${toc.length} sections, ${Math.round(fullContent.length / 1024)}KB`
    );
  }

  console.log("\nDone!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
