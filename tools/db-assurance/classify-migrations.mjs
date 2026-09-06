#!/usr/bin/env node
/**
 * Opsly DB Assurance — migration risk classifier.
 *
 * Reads every .sql file in both migration chains and assigns each one a risk
 * class, so that the promotion policy in docs/database/MIGRATION-POLICY.md is
 * applied from evidence rather than from memory.
 *
 * Classes, highest risk first:
 *   DESTRUCTIVE               drops or rewrites data or a column/table
 *   REQUIRES_APP_COORDINATION renames, retypes, or adds a NOT NULL column
 *                             without a default: old and new app code cannot
 *                             both be correct against this schema
 *   MANUAL_REVIEW             cannot be replayed from clean, or is not atomic
 *                             and touches a sensitive table
 *   BACKWARD_COMPATIBLE       changes access control or constraints; safe for
 *                             running code but changes who can do what
 *   SAFE_ADDITIVE             only adds tables/columns/indexes/comments
 *
 * Usage: node tools/db-assurance/classify-migrations.mjs [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHAINS = [
  ['supabase', path.join(ROOT, 'supabase/migrations')],
  ['peskids', path.join(ROOT, 'apps/peskids/migrations')],
];

// Migrations that a clean replay cannot apply. Sourced from
// `tools/db-assurance/replay.sh --chain resolve`; kept here so the classifier
// is self-contained, and asserted by CI so it cannot silently drift.
const KNOWN_UNREPLAYABLE = new Set([
  '0019_agent_sessions.sql',
  '0099_franchise_core_rls.sql',
  '20260524_add_rls_policies_peskids.sql',
  '20260819_franchise_core_rls.sql',
]);

const RULES = [
  { cls: 'DESTRUCTIVE', re: /\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i,
    why: 'drops a table or schema' },
  { cls: 'DESTRUCTIVE', re: /\bDROP\s+COLUMN\b/i, why: 'drops a column' },
  { cls: 'DESTRUCTIVE', re: /\bTRUNCATE\b/i, why: 'truncates a table' },
  { cls: 'DESTRUCTIVE', re: /^\s*DELETE\s+FROM\b/im, why: 'deletes rows' },

  { cls: 'REQUIRES_APP_COORDINATION', re: /\bRENAME\s+(COLUMN|TO)\b/i,
    why: 'renames a column or table; old and new app code cannot both work' },
  { cls: 'REQUIRES_APP_COORDINATION', re: /\bALTER\s+COLUMN\s+\S+\s+TYPE\b/i,
    why: 'changes a column type' },
  { cls: 'REQUIRES_APP_COORDINATION', re: /\bSET\s+NOT\s+NULL\b/i,
    why: 'tightens a column to NOT NULL; existing NULLs and in-flight writes fail' },
  { cls: 'REQUIRES_APP_COORDINATION', re: /ADD\s+COLUMN[^;]*\bNOT\s+NULL\b(?![^;]*\bDEFAULT\b)/i,
    why: 'adds a NOT NULL column with no default; writes from older app code fail' },

  { cls: 'BACKWARD_COMPATIBLE', re: /\b(REVOKE|DROP\s+POLICY|ALTER\s+DEFAULT\s+PRIVILEGES)\b/i,
    why: 'changes access control' },
  { cls: 'BACKWARD_COMPATIBLE', re: /ADD\s+CONSTRAINT(?![^;]*NOT\s+VALID)/i,
    why: 'adds a validated constraint; scans the table and can fail on existing rows' },
  { cls: 'BACKWARD_COMPATIBLE', re: /\bCREATE\s+(UNIQUE\s+)?INDEX\b(?!\s+CONCURRENTLY)/i,
    why: 'builds an index without CONCURRENTLY, taking a write lock' },
];

const ORDER = ['DESTRUCTIVE', 'REQUIRES_APP_COORDINATION', 'MANUAL_REVIEW',
  'BACKWARD_COMPATIBLE', 'SAFE_ADDITIVE'];

// Strip comments so a class is never assigned from prose in a header block.
const strip = (sql) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

const SENSITIVE = /\b(peskids|public)\.(leads|students|parents|feedback|followups|messages|payments|class_enrollments|audit_log)\b|platform\.(royalty|sales_reports|invoices|tenants)/i;

const rows = [];
for (const [chain, dir] of CHAINS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const sql = strip(raw);

    const atomic = /^\s*BEGIN\s*;/im.test(sql);
    const reasons = [];
    let cls = 'SAFE_ADDITIVE';

    for (const r of RULES) {
      if (r.re.test(sql)) {
        reasons.push(r.why);
        if (ORDER.indexOf(r.cls) < ORDER.indexOf(cls)) cls = r.cls;
      }
    }

    if (KNOWN_UNREPLAYABLE.has(file)) {
      reasons.unshift('does not apply to a clean database (verified by replay)');
      if (ORDER.indexOf('MANUAL_REVIEW') < ORDER.indexOf(cls)) cls = 'MANUAL_REVIEW';
    }
    if (!atomic && SENSITIVE.test(sql)) {
      reasons.push('no BEGIN/COMMIT and touches a sensitive table: a mid-file failure leaves it half applied');
      if (ORDER.indexOf('MANUAL_REVIEW') < ORDER.indexOf(cls)) cls = 'MANUAL_REVIEW';
    }
    if (!atomic && reasons.length === 0) {
      reasons.push('no BEGIN/COMMIT: a mid-file failure leaves it half applied');
    }

    rows.push({ chain, file, cls, atomic, reasons });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

const counts = rows.reduce((a, r) => ((a[r.cls] = (a[r.cls] || 0) + 1), a), {});
console.log(`# Migration classification (${rows.length} files)\n`);
console.log('| class | count |');
console.log('|---|---:|');
for (const c of ORDER) console.log(`| ${c} | ${counts[c] || 0} |`);
console.log(`\nNon-atomic (no BEGIN/COMMIT): ${rows.filter((r) => !r.atomic).length} of ${rows.length}\n`);

for (const c of ORDER) {
  const group = rows.filter((r) => r.cls === c);
  if (!group.length) continue;
  console.log(`\n## ${c}\n`);
  console.log('| chain | migration | atomic | why |');
  console.log('|---|---|:-:|---|');
  for (const r of group) {
    console.log(`| ${r.chain} | \`${r.file}\` | ${r.atomic ? 'yes' : '**no**'} | ${r.reasons.join('; ') || 'adds objects only'} |`);
  }
}
