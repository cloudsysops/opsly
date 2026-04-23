import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

// Opsly structure guardrails (repo-local):
// - Prevent duplicate Obsidian archive identifier filenames across date buckets.
//
// Rationale: markdown files under docs/obsidian/sources/archive use stable IDs; duplicates
// usually mean an ingest/copy mistake and break automation expectations.
async function walkMarkdownFiles(dir) {
  /** @type {string[]} */
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await walkMarkdownFiles(full)));
      continue;
    }
    if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }

  return out;
}

async function main() {
  const archiveRoot = path.join(ROOT, "docs", "obsidian", "sources", "archive");

  let files = [];
  try {
    await fs.stat(archiveRoot);
    files = await walkMarkdownFiles(archiveRoot);
  } catch {
    // If the vault path isn't present in this checkout, don't block dev machines.
    console.log("Structure validation passed (no Obsidian archive tree).");
    return;
  }

  /** @type {Map<string, string[]>} */
  const byBase = new Map();

  for (const abs of files) {
    const base = path.basename(abs);
    const arr = byBase.get(base) ?? [];
    arr.push(abs);
    byBase.set(base, arr);
  }

  const dupes = [...byBase.entries()].filter(([, paths]) => paths.length > 1);
  if (dupes.length === 0) {
    console.log("Structure validation passed.");
    return;
  }

  console.error("Structure validation failed:");
  for (const [name, paths] of dupes.sort((a, b) => a[0].localeCompare(b[0]))) {
    console.error(`- Duplicate archive identifier file "${name}" found in multiple locations: ${paths.join(" | ")}`);
  }
  process.exitCode = 1;
}

await main();
