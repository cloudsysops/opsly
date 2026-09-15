#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

function parseScalar(raw='') {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  const data = {};
  let bodyStart = 0;
  if (lines[0]?.trim() === '---') {
    let i = 1;
    for (; i < lines.length; i += 1) {
      if (lines[i]?.trim() === '---') {
        bodyStart = i + 1;
        break;
      }
      const match = lines[i]?.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (match) data[match[1]] = parseScalar(match[2] ?? '');
    }
  }
  return { frontmatter: data, body: lines.slice(bodyStart).join('\n').trim() };
}

function normalizePriority(value) {
  if (typeof value === 'string' && /^P[123]$/.test(value.toUpperCase())) return value.toUpperCase();
  const n = Number(value);
  if (n === 1) return 'P1';
  if (n === 2) return 'P2';
  return 'P3';
}

function inferRuntime(fm, body) {
  const explicit = String(fm.runtime ?? fm.agent ?? '').trim().toLowerCase();
  if (explicit) return explicit.replace(/^local_/, '');
  const text = body.toLowerCase();
  if (text.includes('review') || text.includes('architecture')) return 'claude';
  if (text.includes('debug') || text.includes('ci failure')) return 'codex';
  if (text.includes('implement') || text.includes('code')) return 'opencode';
  return 'hermes';
}

function inferResourceClass(fm, body) {
  const explicit = String(fm.resource_class ?? '').trim().toLowerCase();
  if (['small','medium','large'].includes(explicit)) return explicit;
  const text = body.toLowerCase();
  if (text.includes('gpu') || text.includes('video') || text.includes('large refactor')) return 'large';
  if (text.length > 8000 || text.includes('integration')) return 'medium';
  return 'small';
}

export function toBackgroundCandidate(fileName, content) {
  const { frontmatter: fm, body } = parseFrontmatter(content);
  const status = String(fm.status ?? 'pending').toLowerCase();
  return {
    id: String(fm.id ?? fileName.replace(/\.md$/, '')),
    file: fileName,
    title: String(fm.title ?? fm.id ?? fileName.replace(/\.md$/, '')),
    status,
    priority: normalizePriority(fm.priority),
    runtime: inferRuntime(fm, body),
    nodeTypes: String(fm.node_types ?? fm.node ?? 'mac')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    resourceClass: inferResourceClass(fm, body),
    blocked: status === 'held' || status === 'blocked',
    requiresApproval: fm.requires_approval === true || fm.autonomy_approved === false,
    paidInfraRequired: fm.paid_infra_required === true,
    productionDeploy: fm.production_deploy === true,
    safeAutonomy: fm.autonomy === 'manual' ? false : true,
    estimatedMinutes: Number(fm.estimated_minutes ?? 30),
    requiresPr: fm.requires_pr === true,
    owner: String(fm.owner ?? ''),
    costClass: String(fm.cost_class ?? '').trim() || null,
    estimatedCostUsd:
      fm.estimated_cost_usd === undefined ? null : Number(fm.estimated_cost_usd),
    environment: String(fm.environment ?? '').trim() || null,
    architecturePatterns: String(fm.architecture_patterns ?? '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean),
    body_preview: body.slice(0, 280),
  };
}

export async function loadNightQueueCandidates(queueDir) {
  const entries = await fs.readdir(queueDir, { withFileTypes: true });
  const out = [];
  for (const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') continue;
    const content = await fs.readFile(path.join(queueDir, entry.name), 'utf8');
    out.push(toBackgroundCandidate(entry.name, content));
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.cwd();
  const queueDir = process.argv[2] ?? path.join(root, 'docs/01-development/night-queue');
  const candidates = await loadNightQueueCandidates(queueDir);
  const pending = candidates.filter((c) => c.status === 'pending');
  console.log(JSON.stringify({
    generated_at: new Date().toISOString(),
    source: queueDir,
    total: candidates.length,
    pending: pending.length,
    candidates: pending,
  }, null, 2));
}
