#!/usr/bin/env node
/**
 * archive-to-obsidian.mjs
 * Ingesta conocimiento abierto desde Internet Archive -> Obsidian vault.
 *
 * Uso:
 *   node scripts/archive-to-obsidian.mjs --query "programming design security marketing"
 *   node scripts/archive-to-obsidian.mjs --query "defensive cybersecurity" --rows 15 --dry-run
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_QUERY =
  'programming OR software design OR marketing OR defensive cybersecurity OR security engineering';
const DEFAULT_ROWS = 10;
const DEFAULT_REFERENCE_ONLY = true; // Space optimization: don't store full content

function argValue(flag, fallback = '') {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function loadDomainsConfig() {
  if (!existsSync(DOMAIN_CONFIG_PATH)) return null;
  const raw = readFileSync(DOMAIN_CONFIG_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.domains !== 'object') {
    return null;
  }
  return parsed.domains;
}

function sanitizeFileName(value) {
  return value.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
}

function stringValue(value, fallback = 'unknown') {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return fallback;
}

function resolveDomainQuery(domainKey, domains) {
  if (!domainKey || !domains) return '';
  const selectedDomain = domains[domainKey];
  if (!selectedDomain || typeof selectedDomain.archiveQuery !== 'string') return '';
  return selectedDomain.archiveQuery;
}

function toArray(subject) {
  if (Array.isArray(subject)) return subject;
  if (typeof subject === 'string' && subject.length > 0) return [subject];
  return [];
}

function buildArchiveUrl(query, rows) {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'description');
  params.append('fl[]', 'creator');
  params.append('fl[]', 'subject');
  params.append('fl[]', 'date');
  params.append('fl[]', 'mediatype');
  params.set('rows', String(rows));
  params.set('page', '1');
  params.set('output', 'json');
  return `https://archive.org/advancedsearch.php?${params.toString()}`;
}

function noteContent(doc, query, domainKey = '', referenceOnly = false) {
  const title = typeof doc.title === 'string' && doc.title.length > 0 ? doc.title : doc.identifier;
  const creator = stringValue(doc.creator, 'unknown');
  const description = stringValue(doc.description, 'No description');
  const subjects = toArray(doc.subject);
  const tags = ['archive', 'open-knowledge', 'learning'].concat(
    subjects.slice(0, 5).map((s) => sanitizeFileName(String(s).toLowerCase()))
  );

  // Reference-only mode: store minimal info with links instead of full content
  if (referenceOnly) {
    return `---
title: "${String(title).replaceAll('"', "'")}"
source: "internet_archive"
identifier: "${doc.identifier ?? ''}"
creator: "${String(creator).replaceAll('"', "'")}"
date: "${doc.date ?? ''}"
mediatype: "${doc.mediatype ?? ''}"
url: "https://archive.org/details/${doc.identifier ?? ''}"
query: "${String(query).replaceAll('"', "'")}"
domain: "${String(domainKey).replaceAll('"', "'")}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
type: reference-only
---

# ${title}

> 🔗 **Referencia externo** - No almacenamos contenido. Visitar fuente original.

## Metadata
- **Creador:** ${creator}
- **Fecha:** ${doc.date ?? 'n/a'}
- **Tipo:** ${doc.mediatype ?? 'n/a'}

## Enlaces
- 📖 [Ver en Internet Archive](https://archive.org/details/${doc.identifier ?? ''})
- 🔍 [Buscar en archive.org](https://archive.org/search.php?q=${encodeURIComponent(query)})

## Actions
- [ ] Visitar fuente original para aprender
- [ ] No guardar contenido (espacio)
- [ ] Si es útil, crear nota propia con aprendizajes

---
*⚡ REFERENCE-ONLY: Solo metadatos, sin contenido almacenado*
`;
  }

  return `---
title: "${String(title).replaceAll('"', "'")}"
source: "internet_archive"
identifier: "${doc.identifier ?? ''}"
creator: "${String(creator).replaceAll('"', "'")}"
date: "${doc.date ?? ''}"
mediatype: "${doc.mediatype ?? ''}"
url: "https://archive.org/details/${doc.identifier ?? ''}"
query: "${String(query).replaceAll('"', "'")}"
domain: "${String(domainKey).replaceAll('"', "'")}"
tags: [${tags.map((t) => `"${t}"`).join(', ')}]
---

# ${title}

## Summary
${description}

## Key Subjects
${subjects.length > 0 ? subjects.map((s) => `- ${String(s)}`).join('\n') : '- n/a'}

## Source
- Internet Archive: https://archive.org/details/${doc.identifier ?? ''}
- Search endpoint: https://archive.org/

## Opsly Actions
- [ ] Link this note to a topic MOC in Obsidian.
- [ ] Decide if this source should be sent to NotebookLM.
- [ ] If useful, create reusable playbook/skill improvement.
`;
}

async function main() {
  const domainKey = argValue('--domain', '').trim();
  const domains = loadDomainsConfig();
  const domainQuery = resolveDomainQuery(domainKey, domains);
  const query = argValue('--query', domainQuery || DEFAULT_QUERY);
  const rows = Number.parseInt(argValue('--rows', String(DEFAULT_ROWS)), 10);
  const dryRun = hasFlag('--dry-run');

  const root = process.cwd();
  const today = new Date().toISOString().slice(0, 10);
  const outputDir = domainKey
    ? join(root, 'docs', 'obsidian', 'sources', 'archive', domainKey, today)
    : join(root, 'docs', 'obsidian', 'sources', 'archive', today);
  const archiveUrl = buildArchiveUrl(query, Number.isFinite(rows) ? rows : DEFAULT_ROWS);

  const response = await fetch(archiveUrl);
  if (!response.ok) {
    throw new Error(`Archive query failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  const docs = payload?.response?.docs;
  if (!Array.isArray(docs)) {
    throw new TypeError('Unexpected archive response format');
  }

  if (!dryRun && !existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  let written = 0;
  const referenceOnly = !hasFlag('--store-full'); // Default: reference-only
  for (const doc of docs) {
    if (!doc?.identifier) continue;
    const fileName = `${sanitizeFileName(String(doc.identifier))}.md`;
    const target = join(outputDir, fileName);
    const content = noteContent(doc, query, domainKey, referenceOnly);
    if (!dryRun) {
      writeFileSync(target, content, 'utf8');
    }
    written += 1;
  }

  const mode = dryRun ? 'DRY-RUN' : 'WRITE';
  process.stdout.write(
    `[archive-to-obsidian] ${mode}: ${written} notes (${query}) -> ${outputDir}\n`
  );
}

await main();
