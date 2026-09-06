#!/usr/bin/env node
/**
 * Opsly DB Assurance — schema analyzer.
 *
 * Reads the JSON emitted by `sql/10-inventory.sql` against the EPHEMERAL replay
 * database and renders the two ground-truth Markdown artifacts:
 *
 *   docs/database/EXPECTED-SCHEMA.md  — what the migration chain actually builds
 *   docs/database/RLS-MATRIX.md       — per-table RLS + policy coverage
 *
 * This script never connects to a database itself; it only transforms the
 * inventory JSON. Run it via `tools/db-assurance/run-audit.sh`.
 *
 * Usage: node tools/db-assurance/analyze.mjs <inventory.json> <outDir>
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , inventoryPath, outDir] = process.argv;
if (!inventoryPath || !outDir) {
  console.error('usage: analyze.mjs <inventory.json> <outDir>');
  process.exit(2);
}

/** @type {Array<Record<string, any>>} */
const tables = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

// Schemas that hold tenant-scoped customer, child, or franchise data. A table
// here with RLS off is a finding, not a style note.
const SENSITIVE_SCHEMAS = new Set(['peskids', 'public', 'platform']);

// Tables whose names indicate they hold data about a child, a parent, a paying
// customer, or franchise money. Used to raise severity.
const SENSITIVE_NAME = /(lead|student|parent|child|family|teacher|guardian|attendance|enrollment|payment|invoice|royalt|subscription|franchis|referral|notification|message|feedback|contact|applicant|audit|consent|dsar|breach)/i;

const MONEY_NAME = /(amount|price|cost|fee|total|sales|royalt|revenue|balance|discount|payment|charge|refund|tax|budget|spend|usd|cop|minor)/i;
const FLOATY = /^(real|double precision|float)/i;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const fq = (t) => `${t.schema}.${t.table}`;

/** Policy commands present on a table, expanded so ALL covers everything. */
function coverage(t) {
  const cov = new Set();
  for (const p of t.policies) {
    if (p.cmd === 'ALL') ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].forEach((c) => cov.add(c));
    else cov.add(p.cmd);
  }
  return cov;
}

/** Policies that apply to a non-service role (i.e. actually constrain a user). */
function nonServicePolicies(t) {
  return t.policies.filter(
    (p) => !(p.roles.length === 1 && p.roles[0] === 'service_role'),
  );
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------
const findings = [];
const add = (sev, code, table, detail) => findings.push({ sev, code, table, detail });

for (const t of tables) {
  const name = fq(t);
  const sensitive = SENSITIVE_SCHEMAS.has(t.schema) && SENSITIVE_NAME.test(t.table);

  if (!t.rls_enabled) {
    add(
      sensitive ? 'CRITICAL' : 'HIGH',
      'RLS_DISABLED',
      name,
      'Row Level Security is not enabled. Any role holding a table grant reads every tenant\'s rows; isolation depends entirely on application-level filtering.',
    );
  } else {
    const cov = coverage(t);
    const userPols = nonServicePolicies(t);
    if (t.policies.length === 0) {
      add('MEDIUM', 'RLS_NO_POLICY', name,
        'RLS is enabled but no policy exists: the table is deny-all for every non-superuser, non-BYPASSRLS role. Either intentional (service-role-only) or an accidental outage.');
    } else if (userPols.length === 0) {
      add('LOW', 'RLS_SERVICE_ONLY', name,
        'RLS enabled, but every policy targets service_role only. Effectively service-role-only access; end-user reads must go through an API that holds the service key.');
    } else {
      for (const c of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        if (!cov.has(c)) {
          add('LOW', `RLS_NO_${c}`, name, `No ${c} policy. That command is denied for non-BYPASSRLS roles.`);
        }
      }
    }
  }

  // --- money representation --------------------------------------------------
  for (const c of t.columns) {
    if (!MONEY_NAME.test(c.name)) continue;
    if (FLOATY.test(c.type)) {
      add('CRITICAL', 'MONEY_FLOAT', `${name}.${c.name}`,
        `Money-like column typed \`${c.type}\`. Binary floating point cannot represent decimal currency exactly; use numeric(p,s) or an integer minor-unit column.`);
    } else if (/^numeric$/i.test(c.type)) {
      add('HIGH', 'MONEY_UNCONSTRAINED_NUMERIC', `${name}.${c.name}`,
        'Money-like column is unconstrained `numeric` (no precision/scale). Scale is then per-value, so rounding is not enforced by the database.');
    }
  }

  // --- tenant scoping --------------------------------------------------------
  const tenantCols = t.columns.filter((c) => /^(tenant_id|tenant_slug)$/.test(c.name));
  const fks = t.constraints.filter((c) => c.kind === 'f');
  for (const tc of tenantCols) {
    const hasFk = fks.some((f) => new RegExp(`\\(${tc.name}\\)`).test(f.def));
    if (!hasFk) {
      add(
        sensitive ? 'HIGH' : 'MEDIUM',
        'TENANT_NO_FK',
        `${name}.${tc.name}`,
        `Tenant discriminator \`${tc.name} ${tc.type}\` has no FOREIGN KEY to platform.tenants. Nothing at the database level stops a typo'd or deleted tenant key from creating orphaned, invisible rows.`,
      );
    }
    if (!tc.not_null) {
      add('HIGH', 'TENANT_NULLABLE', `${name}.${tc.name}`,
        'Tenant discriminator is NULLABLE. A NULL tenant row escapes every `tenant_id = ...` predicate, including RLS policies.');
    }
  }

  // --- primary keys ----------------------------------------------------------
  if (!t.constraints.some((c) => c.kind === 'p')) {
    add('MEDIUM', 'NO_PRIMARY_KEY', name,
      'Table has no PRIMARY KEY. Duplicate rows cannot be prevented or de-duplicated, and logical replication/PITR tooling degrades.');
  }

  // --- unindexed foreign keys -----------------------------------------------
  for (const f of fks) {
    const m = /FOREIGN KEY \(([^)]+)\)/.exec(f.def);
    if (!m) continue;
    const col = m[1].split(',')[0].trim().replace(/"/g, '');
    const indexed = t.indexes.some((i) => new RegExp(`\\(\\s*"?${col}"?`).test(i.def));
    if (!indexed) {
      add('LOW', 'FK_NOT_INDEXED', `${name}.${col}`,
        `FK column is not the leading column of any index. Parent DELETE/UPDATE takes a sequential scan of this table, and joins from the parent are unsupported.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
const SEV_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
findings.sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || cmp(a.code, b.code) || cmp(a.table, b.table));

const stamp = new Date().toISOString().slice(0, 10);
const header = (title, extra) => `---
status: generated
owner: devops
generated_by: tools/db-assurance/analyze.mjs
date: ${stamp}
---

# ${title}

> **Generated artifact — do not hand-edit.** Regenerate with
> \`tools/db-assurance/run-audit.sh\`.
>
> **Source of truth:** this describes the schema produced by replaying the
> committed migration chains (\`supabase/migrations/\` + \`apps/peskids/migrations/\`)
> into a clean, local, ephemeral Postgres. It is **not** a dump of staging or
> production. Nothing in this repository proves the live databases match it —
> confirming that requires dashboard/API access to Supabase project
> \`jkwykpldnitavhmtuzmo\`, which the audit that produced this file did not have.
${extra ?? ''}
`;

// --- EXPECTED-SCHEMA.md ------------------------------------------------------
const bySchema = new Map();
for (const t of tables) {
  if (!bySchema.has(t.schema)) bySchema.set(t.schema, []);
  bySchema.get(t.schema).push(t);
}

let expected = header('EXPECTED Schema (replay ground truth)');
expected += `
## Summary

| Schema | Tables | RLS on | RLS off |
|---|---:|---:|---:|
`;
for (const [s, ts] of [...bySchema].sort()) {
  expected += `| \`${s}\` | ${ts.length} | ${ts.filter((t) => t.rls_enabled).length} | ${ts.filter((t) => !t.rls_enabled).length} |\n`;
}
expected += `| **total** | **${tables.length}** | **${tables.filter((t) => t.rls_enabled).length}** | **${tables.filter((t) => !t.rls_enabled).length}** |\n`;

for (const [s, ts] of [...bySchema].sort()) {
  expected += `\n---\n\n## Schema \`${s}\`\n`;
  for (const t of ts.sort((a, b) => cmp(a.table, b.table))) {
    const pk = t.constraints.find((c) => c.kind === 'p');
    const fks = t.constraints.filter((c) => c.kind === 'f');
    const uqs = t.constraints.filter((c) => c.kind === 'u');
    const cks = t.constraints.filter((c) => c.kind === 'c');
    expected += `\n### \`${s}.${t.table}\`\n\n`;
    expected += `- **RLS:** ${t.rls_enabled ? `enabled${t.rls_forced ? ' (FORCE)' : ''}` : '**disabled**'} · **policies:** ${t.policies.length}\n`;
    expected += `- **PK:** ${pk ? `\`${pk.def}\`` : '**none**'}\n`;
    if (uqs.length) expected += `- **UNIQUE:** ${uqs.map((u) => `\`${u.name}\``).join(', ')}\n`;
    if (fks.length) expected += `- **FK:** ${fks.map((f) => `\`${f.name}\` → \`${f.ref_schema}.${f.ref_table}\``).join(', ')}\n`;
    if (cks.length) expected += `- **CHECK:** ${cks.length} constraint(s)\n`;
    expected += `\n| column | type | not null | default |\n|---|---|---|---|\n`;
    for (const c of t.columns) {
      const dflt = c.default ? `\`${String(c.default).replace(/\|/g, '\\|').slice(0, 60)}\`` : '';
      expected += `| \`${c.name}\` | \`${c.type}\` | ${c.not_null ? 'YES' : ''} | ${dflt} |\n`;
    }
  }
}

// --- RLS-MATRIX.md -----------------------------------------------------------
let rls = header('RLS Policy Matrix', `
>
> \`service-only\` marks a table whose only policies target \`service_role\`.
> \`service_role\` is **BYPASSRLS** in Supabase, so such a table is not protected
> by RLS at all — it is protected by keeping the service key off the client.`);

rls += `
## Coverage matrix

Legend — **S**/**I**/**U**/**D** = a SELECT / INSERT / UPDATE / DELETE policy
exists (an \`ALL\` policy counts for all four). A blank cell means that command
is **denied** for every non-BYPASSRLS role.

| table | RLS | pol | S | I | U | D | non-service roles |
|---|---|---:|:-:|:-:|:-:|:-:|---|
`;
for (const t of [...tables].sort((a, b) => cmp(fq(a), fq(b)))) {
  const cov = coverage(t);
  const roles = [...new Set(nonServicePolicies(t).flatMap((p) => p.roles))].sort();
  const mark = (c) => (cov.has(c) ? '✓' : '');
  rls += `| \`${fq(t)}\` | ${t.rls_enabled ? (t.rls_forced ? 'FORCE' : 'on') : '**OFF**'} | ${t.policies.length} | ${mark('SELECT')} | ${mark('INSERT')} | ${mark('UPDATE')} | ${mark('DELETE')} | ${roles.length ? roles.map((r) => `\`${r}\``).join(' ') : '_service-only_'} |\n`;
}

rls += `\n---\n\n## Policy definitions\n`;
for (const t of [...tables].sort((a, b) => cmp(fq(a), fq(b)))) {
  if (!t.policies.length) continue;
  rls += `\n### \`${fq(t)}\`\n\n`;
  for (const p of t.policies) {
    rls += `- **\`${p.name}\`** — \`${p.cmd}\` to ${p.roles.map((r) => `\`${r}\``).join(', ')}\n`;
    if (p.using) rls += `  - \`USING\`: \`${String(p.using).replace(/\s+/g, ' ').slice(0, 300)}\`\n`;
    if (p.check) rls += `  - \`WITH CHECK\`: \`${String(p.check).replace(/\s+/g, ' ').slice(0, 300)}\`\n`;
  }
}

// --- FINDINGS.md -------------------------------------------------------------
let fnd = header('Schema Findings (automated)', `
>
> Severity is assigned by heuristic: a table matching a customer/child/money
> name pattern in \`peskids\`, \`public\` or \`platform\` is treated as sensitive.
> Triage each finding — this file reports what the schema *is*, not what the
> business requires it to be.`);

const counts = findings.reduce((a, f) => ((a[f.sev] = (a[f.sev] || 0) + 1), a), {});
fnd += `\n## Totals\n\n| severity | count |\n|---|---:|\n`;
for (const s of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) fnd += `| ${s} | ${counts[s] || 0} |\n`;
fnd += `| **total** | **${findings.length}** |\n`;

let lastCode = null;
for (const f of findings) {
  if (f.code !== lastCode) {
    fnd += `\n---\n\n## ${f.code} (${f.sev})\n\n`;
    fnd += `${f.detail}\n\n`;
    lastCode = f.code;
  }
  fnd += `- \`${f.table}\`\n`;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'EXPECTED-SCHEMA.md'), expected);
fs.writeFileSync(path.join(outDir, 'RLS-MATRIX.md'), rls);
fs.writeFileSync(path.join(outDir, 'SCHEMA-FINDINGS.md'), fnd);

console.log(`tables=${tables.length} findings=${findings.length}`, JSON.stringify(counts));
