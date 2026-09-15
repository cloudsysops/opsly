#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

function parseScalar(raw = '') {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error('workpack must start with YAML frontmatter');

  const meta = {};
  for (const raw of match[1].split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    meta[line.slice(0, i).trim()] = parseScalar(line.slice(i + 1));
  }
  return { meta, body: match[2].trim() };
}

function requireField(meta, key) {
  if (meta[key] === undefined || meta[key] === null || meta[key] === '') {
    throw new Error(`missing required frontmatter field: ${key}`);
  }
}

function bool(meta, key, fallback = false) {
  if (meta[key] === undefined) return fallback;
  if (typeof meta[key] !== 'boolean') {
    throw new Error(`${key} must be an explicit YAML boolean`);
  }
  return meta[key];
}

function safe(value) {
  return String(value ?? '').trim();
}

function renderHandoff({ source, meta, body }) {
  requireField(meta, 'id');
  requireField(meta, 'owner');
  requireField(meta, 'priority');

  const requiresPr = bool(meta, 'requires_pr', false);
  const requiresApproval = bool(meta, 'requires_approval', false);
  const productionDeploy = bool(meta, 'production_deploy', false);
  const paidInfra = bool(meta, 'paid_infra_required', false);

  const lines = [
    '# Opsly Interactive Agent Handoff v1',
    '',
    '> Transport: human_relay / interactive_subscription',
    '> This is NOT a second task store or execution queue. GitHub/Opsly remains canonical.',
    '',
    '## Identity',
    '',
    `- Work ID: ${safe(meta.id)}`,
    `- Title: ${safe(meta.title || meta.id)}`,
    `- Owner: ${safe(meta.owner)}`,
    `- Priority: ${safe(meta.priority)}`,
    `- Workstream: ${safe(meta.workstream) || 'unspecified'}`,
    `- Conflict key: ${safe(meta.conflict_key) || 'unspecified'}`,
    `- Depends on: ${safe(meta.depends_on) || 'none declared'}`,
    `- Environment: ${safe(meta.environment) || 'unspecified'}`,
    `- Source workpack: ${source}`,
    '',
    '## Admission rules',
    '',
    '1. Read AGENTS.md and the canonical architecture docs referenced by the workpack before editing.',
    '2. Search for an existing Issue, PR, branch, or active claim with the same intent before starting.',
    '3. If equivalent work already exists, stop and report the canonical work item instead of duplicating it.',
    '4. If work is safe to split, own only the declared slice and avoid overlapping unstable contracts.',
    '5. Do not create another scheduler, registry, approval store, task store, or execution queue.',
    '',
    '## Safety contract',
    '',
    `- Requires PR: ${requiresPr}`,
    `- Requires approval: ${requiresApproval}`,
    `- Production deploy allowed by workpack: ${productionDeploy}`,
    `- Paid infrastructure allowed by workpack: ${paidInfra}`,
    '- Never expose or copy secrets into chat, commits, PR bodies, logs, or evidence.',
    '- Production data mutation, secret rotation, DNS/routing changes, migration execution, and production side effects require explicit authorization even if a model suggests them.',
    '',
    '## Task',
    '',
    body || '_No body supplied._',
    '',
    '## Canonical GitHub handback',
    '',
    'If this work creates or updates a pull request, preserve this exact marker in the PR body so Mission Control can correlate the human-relay session with GitHub evidence:',
    '',
    '<!-- opsly-work-evidence-v1',
    JSON.stringify({
      schema_version: 'opsly-work-evidence-v1',
      work_id: safe(meta.id),
      transport: 'human_relay',
      session_type: 'interactive_subscription',
      agent_id: safe(meta.owner),
      workstream: safe(meta.workstream) || null,
      conflict_key: safe(meta.conflict_key) || null,
    }),
    '-->',
    '',
    'Do not change work_id or transport in that marker. GitHub remains the durable evidence surface; do not create another task/evidence store.',
    '',
    '## Completion evidence',
    '',
    'Return a concise machine-readable-friendly report containing:',
    '- work_id',
    '- status: DONE | BLOCKED | SUPERSEDED | NEEDS_REVIEW',
    '- branch (if any)',
    '- commit_sha (if any)',
    '- pr_url (if any)',
    '- head_sha (if any)',
    '- verifier: PASS | FAIL | BLOCKED | UNKNOWN',
    '- merge_readiness: READY | BLOCKED | UNKNOWN',
    '- files_changed',
    '- checks_run and results',
    '- blockers',
    '- follow_up',
    '',
    'Do not return private chain-of-thought. Return only decisions, actions, evidence, and blockers.',
    ''
  ];

  return lines.join('\n');
}

function parseArgs(argv) {
  const input = argv[2];
  if (!input) throw new Error('usage: interactive-agent-handoff.mjs <workpack.md> [--out <file>]');

  const outIndex = argv.indexOf('--out');
  return {
    input,
    out: outIndex >= 0 && argv[outIndex + 1] ? argv[outIndex + 1] : null,
  };
}

const { input, out } = parseArgs(process.argv);
const root = process.cwd();
const absolute = path.resolve(root, input);
const content = await fs.readFile(absolute, 'utf8');
const { meta, body } = parseFrontmatter(content);
const rendered = renderHandoff({
  source: path.relative(root, absolute) || input,
  meta,
  body,
});

if (out) {
  const outPath = path.resolve(root, out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, rendered, 'utf8');
  console.log(`Wrote ${outPath}`);
} else {
  process.stdout.write(rendered);
}
