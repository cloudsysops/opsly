#!/usr/bin/env node
/**
 * sync-brain-sessions.ts — Sincroniza sesiones de agentes + índice Obsidian
 * Uso: node scripts/sync-brain-sessions.ts
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const VAULT_PATH = 'docs/brain';
const INDEX_PATH = 'docs/brain/index.json';
const SESSIONS_DIR = 'docs/brain/sessions';

interface Session {
  agent: string;
  date: string;
  branch?: string;
  commit?: string;
  summary?: string;
  outcome: 'completed' | 'pending' | 'failed';
}

// Extract sessions from git log
function extractSessions(): Session[] {
  const sessions: Session[] = [];

  try {
    const log = execSync('git log --oneline --decorate -50', { encoding: 'utf-8' });
    const lines = log.split('\n').filter(Boolean);

    for (const line of lines) {
      // Parse commit message for agent info
      const match = line.match(/^(\w+)\s+(.+?):\s*(.+)/);
      if (!match) continue;

      const [, hash, type, msg] = match;
      let agent = 'unknown';

      if (msg.includes('claude') || type === 'feat') agent = 'claude';
      else if (msg.includes('cursor')) agent = 'cursor';
      else if (msg.includes('codex')) agent = 'codex';
      else if (msg.includes('worker')) agent = 'workers';

      sessions.push({
        agent,
        date: new Date().toISOString(),
        commit: hash,
        summary: msg.substring(0, 80),
        outcome: msg.includes('fix') || msg.includes('feat') ? 'completed' : 'pending',
      });
    }
  } catch (e) {
    console.log('Could not extract git log');
  }

  return sessions;
}

// Build vault index
function buildVaultIndex() {
  const index: any = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    stats: {
      totalNotes: 0,
      totalTags: 0,
      byCategory: {},
    },
    notes: [],
    tags: new Set<string>(),
  };

  function walkDir(dir: string, category = '') {
    if (!existsSync(dir)) return;

    const files = readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(dir, file.name);

      if (file.isDirectory()) {
        walkDir(fullPath, file.name);
      } else if (file.name.endsWith('.md')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const tagMatch = content.match(/tags:\s*\[(.*?)\]/);
          const tags = tagMatch
            ? tagMatch[1].split(',').map((t) => t.trim().replace(/['"]/g, ''))
            : [];

          tags.forEach((t) => index.tags.add(t));

          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : file.name;

          index.notes.push({
            path: `${category}/${file.name}`,
            title,
            tags,
            size: content.length,
          });

          index.stats.byCategory[category] = (index.stats.byCategory[category] || 0) + 1;
          index.stats.totalNotes++;
        } catch (e) {
          // Silent
        }
      }
    }
  }

  walkDir(VAULT_PATH);
  index.stats.totalTags = index.tags.size;
  index.tags = Array.from(index.tags);

  return index;
}

// Main
async function main() {
  console.log('🧠 Syncing Obsidian Brain + Agent Sessions...\n');

  // Build vault index
  const vaultIndex = buildVaultIndex();
  writeFileSync(INDEX_PATH, JSON.stringify(vaultIndex, null, 2));
  console.log(`✅ Vault indexed: ${vaultIndex.stats.totalNotes} notes`);

  // Extract agent sessions
  const sessions = extractSessions();
  console.log(`✅ Sessions extracted: ${sessions.length} commits\n`);

  // Create sessions MOC
  const sessionsMoc = `# Agent Sessions Index

> Histórico de todas las sesiones de agentes (Claude, Cursor, Codex, Workers)
> Actualizado: ${new Date().toISOString()}

## Por Agente

- [[./by-agent/claude|Claude Sessions]]
- [[./by-agent/cursor|Cursor Sessions]]
- [[./by-agent/codex|Codex Sessions]]
- [[./by-agent/workers|Workers Sessions]]

## Recientes

${sessions.slice(0, 10).map((s) => `- **${s.agent}** (${s.outcome}): ${s.summary}`).join('\n')}

## Stats

- Total notes en vault: ${vaultIndex.stats.totalNotes}
- Tags: ${vaultIndex.stats.totalTags}
- Últimas 50 sesiones indexadas

`;

  if (!existsSync(SESSIONS_DIR)) {
    execSync(`mkdir -p ${SESSIONS_DIR}`);
  }

  writeFileSync(join(SESSIONS_DIR, 'index.md'), sessionsMoc);
  console.log(`✅ Sessions MOC created: ${join(SESSIONS_DIR, 'index.md')}`);
  console.log('\n🎯 Obsidian Brain ready for agent queries!');
}

main().catch(console.error);
