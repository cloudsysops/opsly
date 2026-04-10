#!/usr/bin/env node
/**
 * Genera JSON de índice Repo-First RAG: topics → rutas relativas .md
 * Sin APIs externas; solo fs. Invocado por scripts/index-knowledge.sh
 */
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.argv[2] || process.cwd();

function addTopic(topics, topic, relPath) {
  const k = topic.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (k.length < 2) {
    return;
  }
  if (!topics[k]) {
    topics[k] = [];
  }
  if (!topics[k].includes(relPath)) {
    topics[k].push(relPath);
  }
}

function topicsFromPath(relPath) {
  const stem = relPath.replace(/\.md$/i, "").split(/[/\\]/).pop() ?? "";
  const parts = stem.split(/[-_\s]+/).filter((p) => p.length >= 2);
  return [stem, ...parts];
}

async function walkMarkdownFiles(dir, baseRoot, acc) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      await walkMarkdownFiles(p, baseRoot, acc);
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      acc.push(relative(baseRoot, p).replace(/\\/g, "/"));
    }
  }
  return acc;
}

async function main() {
  const topics = {};
  const files = new Set();
  const mdList = [];

  const docsDir = join(root, "docs");
  await walkMarkdownFiles(docsDir, root, mdList);

  for (const rf of ["AGENTS.md", "VISION.md"]) {
    try {
      const s = await stat(join(root, rf));
      if (s.isFile()) {
        mdList.push(rf);
      }
    } catch {
      /* omit */
    }
  }

  for (const rel of mdList) {
    files.add(rel);
    for (const t of topicsFromPath(rel)) {
      addTopic(topics, t, rel);
    }
    addTopic(topics, "opsly", rel);
  }

  const special = {
    agents: "AGENTS.md",
    vision: "VISION.md",
    roadmap: "VISION.md",
  };
  for (const [k, v] of Object.entries(special)) {
    try {
      const s = await stat(join(root, v));
      if (s.isFile()) {
        addTopic(topics, k, v);
      }
    } catch {
      /* omit */
    }
  }

  const out = {
    version: 1,
    root: root.replace(/\\/g, "/"),
    generated_at: new Date().toISOString(),
    topics,
    files: [...files].sort(),
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

await main();
