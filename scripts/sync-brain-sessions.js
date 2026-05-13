#!/usr/bin/env node
const { readFileSync, writeFileSync, existsSync, readdirSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const VAULT_PATH = 'docs/brain';
const INDEX_PATH = 'docs/brain/index.json';
const SESSIONS_DIR = 'docs/brain/sessions';

function buildVaultIndex() {
  const index = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    stats: { totalNotes: 0, totalTags: 0, byCategory: {} },
    notes: [],
    tags: new Set(),
  };

  function walk(dir, cat = '') {
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, file.name);
      if (file.isDirectory()) walk(full, file.name);
      else if (file.name.endsWith('.md')) {
        try {
          const content = readFileSync(full, 'utf-8');
          const tags = (content.match(/tags:\s*\[(.*?)\]/) || [, ''])[1]
            .split(',')
            .map(t => t.trim().replace(/['"]/g, ''))
            .filter(Boolean);
          const title = (content.match(/^#\s+(.+)$/m) || [, file.name])[1];
          
          tags.forEach(t => index.tags.add(t));
          index.notes.push({ path: `${cat}/${file.name}`, title, tags });
          index.stats.byCategory[cat] = (index.stats.byCategory[cat] || 0) + 1;
          index.stats.totalNotes++;
        } catch (e) {}
      }
    }
  }
  
  walk(VAULT_PATH);
  index.tags = Array.from(index.tags);
  index.stats.totalTags = index.tags.length;
  return index;
}

const idx = buildVaultIndex();
writeFileSync(INDEX_PATH, JSON.stringify(idx, null, 2));

if (!existsSync(SESSIONS_DIR)) {
  execSync(`mkdir -p ${SESSIONS_DIR}/by-agent`);
}

const moc = `# 🧠 Agent Sessions Brain Index

Generated: ${new Date().toISOString()}

## By Agent
- [[by-agent/claude|Claude]]
- [[by-agent/cursor|Cursor]]
- [[by-agent/codex|Codex]]
- [[by-agent/workers|Workers]]

## Vault Stats
- **Notes:** ${idx.stats.totalNotes}
- **Tags:** ${idx.stats.totalTags}
- **Categories:** ${Object.keys(idx.stats.byCategory).join(', ')}
`;

writeFileSync(path.join(SESSIONS_DIR, 'index.md'), moc);
console.log('✅ Brain index built + sessions MOC created');
