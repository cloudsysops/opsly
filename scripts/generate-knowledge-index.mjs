#!/usr/bin/env node
/**
 * Índice Repo-First (wikilinks estilo Obsidian): escanea *.md, título (#), keywords (## + ruta + título).
 * Invocado por scripts/index-knowledge.sh (find | node) o directamente con raíz del repo.
 */
import { readFile, stat } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';

const MAX_KEYWORDS_PER_FILE = 48;
const STOP = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'its',
  'may',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'el',
  'la',
  'de',
  'en',
  'un',
  'una',
  'los',
  'las',
  'del',
  'por',
  'con',
  'que',
  'como',
  'para',
]);

function normKeyword(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '');
}

function wordsFromText(text) {
  const raw = String(text).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const parts = raw.split(/[^a-z0-9]+/).filter((p) => p.length >= 3);
  const out = [];
  for (const p of parts) {
    const w = normKeyword(p);
    if (w.length >= 3 && !STOP.has(w)) {
      out.push(w);
    }
  }
  return out;
}

function stemKeywords(relPath) {
  const base = basename(relPath, '.md');
  return wordsFromText(base.replace(/[-_]+/g, ' '));
}

function uniqueLimited(words) {
  const seen = new Set();
  const out = [];
  for (const w of words) {
    if (seen.has(w)) {
      continue;
    }
    seen.add(w);
    out.push(w);
    if (out.length >= MAX_KEYWORDS_PER_FILE) {
      break;
    }
  }
  return out;
}

/**
 * @param {string} content
 * @returns {{ title: string, headerLines: string[] }}
 */
function extractTitleAndHeaders(content) {
  const lines = content.split(/\r?\n/);
  let title = '';
  const headerLines = [];
  for (const line of lines) {
    const h1 = line.match(/^\s*#\s+(.+)$/);
    if (h1 && !title) {
      title = h1[1].trim();
    }
    const hx = line.match(/^\s*#{2,6}\s+(.+)$/);
    if (hx) {
      headerLines.push(hx[1].trim());
    }
  }
  return { title, headerLines };
}

function buildKeywords(relPath, title, headerLines) {
  const collected = [];
  for (const w of stemKeywords(relPath)) {
    collected.push(w);
  }
  for (const w of wordsFromText(title)) {
    collected.push(w);
  }
  for (const h of headerLines.slice(0, 12)) {
    for (const w of wordsFromText(h)) {
      collected.push(w);
    }
  }
  collected.push('opsly', 'markdown');
  const sorted = uniqueLimited(collected);
  return sorted.sort();
}

function addTopic(topics, topic, relPath) {
  const k = normKeyword(topic);
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

function topicsFromKeywords(topics, relPath, keywords) {
  for (const k of keywords) {
    addTopic(topics, k, relPath);
  }
}

/**
 * @param {string} absPath
 * @param {string} root
 */
async function indexOneFile(absPath, root) {
  const rel = relative(root, absPath).replace(/\\/g, '/');
  let st;
  try {
    st = await stat(absPath);
  } catch {
    return null;
  }
  let raw = '';
  try {
    raw = await readFile(absPath, 'utf8');
  } catch {
    return null;
  }
  const head = raw.length > 120_000 ? raw.slice(0, 120_000) : raw;
  const { title: rawTitle, headerLines } = extractTitleAndHeaders(head);
  const stem = basename(rel, '.md');
  const title = rawTitle || stem;
  const keywords = buildKeywords(rel, title, headerLines);
  return {
    path: rel,
    title,
    keywords,
    size_bytes: st.size,
  };
}

async function readStdinPaths() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const buf = Buffer.concat(chunks);
  const s = buf.toString('utf8');
  return s.split('\0').filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);
  let root = process.cwd();
  let fromStdin = false;

  if (args[0] === '--stdin0' && args[1]) {
    fromStdin = true;
    root = resolve(args[1]);
  } else if (args[0] && !args[0].startsWith('-')) {
    root = resolve(args[0]);
  }

  /** @type {string[]} */
  let absPaths = [];
  if (fromStdin) {
    absPaths = await readStdinPaths();
  } else {
    const { readdir } = await import('node:fs/promises');
    const skip = new Set(['node_modules', '.git', 'dist', '.next', 'coverage', '.turbo', 'build']);

    async function walk(dir) {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (skip.has(e.name)) {
            continue;
          }
          await walk(p);
        } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
          absPaths.push(p);
        }
      }
    }
    await walk(root);
  }

  const topics = {};
  /** @type {Awaited<ReturnType<typeof indexOneFile>>[]} */
  const fileEntries = [];

  for (const abs of absPaths) {
    const resolved = resolve(abs);
    if (!resolved.startsWith(root)) {
      continue;
    }
    const entry = await indexOneFile(resolved, root);
    if (!entry) {
      continue;
    }
    fileEntries.push(entry);
    topicsFromKeywords(topics, entry.path, entry.keywords);
  }

  fileEntries.sort((a, b) => a.path.localeCompare(b.path));

  const out = {
    version: 1,
    root: root.replace(/\\/g, '/'),
    generated_at: new Date().toISOString(),
    files: fileEntries,
    topics,
    /** @deprecated compat lectura antigua */
    file_paths: fileEntries.map((f) => f.path),
  };

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

await main();
