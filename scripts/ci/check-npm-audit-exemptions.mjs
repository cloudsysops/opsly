#!/usr/bin/env node
/**
 * Filters an `npm audit --json` report against the documented, reviewed
 * exemption list (docs/security/npm-audit-exemptions.json) so a vulnerability
 * with no available fix doesn't permanently red-X every PR. Only advisories
 * explicitly listed by GHSA ID are exempted — a new advisory on an
 * already-exempted package is NOT auto-exempted, it must be added here.
 *
 * Exit 0 = no non-exempted moderate+ vulnerabilities. Exit 1 = otherwise.
 *
 * Usage:
 *   node scripts/ci/check-npm-audit-exemptions.mjs <audit-report.json>
 */
'use strict';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXEMPTIONS_PATH = join(__dirname, '..', '..', 'docs', 'security', 'npm-audit-exemptions.json');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function advisoryIdsFor(vuln) {
  const ids = new Set();
  for (const via of vuln.via ?? []) {
    if (typeof via !== 'object' || !via.url) continue;
    const match = /advisories\/(GHSA-[a-z0-9-]+)/i.exec(via.url);
    if (match) ids.add(match[1]);
  }
  return ids;
}

function main() {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error('Usage: check-npm-audit-exemptions.mjs <audit-report.json>');
    process.exit(2);
  }

  const report = loadJson(reportPath);
  const exemptions = loadJson(EXEMPTIONS_PATH);
  const exemptedIds = new Map(exemptions.exemptions.map((e) => [e.advisory, e]));

  const vulnerabilities = report.vulnerabilities ?? {};
  const blocking = [];
  const exempted = [];

  for (const [name, vuln] of Object.entries(vulnerabilities)) {
    const ids = advisoryIdsFor(vuln);
    if (ids.size === 0) {
      // Pure "effects" entry (depends on a vulnerable package) with no
      // advisory of its own — not independently blocking.
      continue;
    }
    const unexemptedIds = [...ids].filter((id) => !exemptedIds.has(id));
    if (unexemptedIds.length === 0) {
      exempted.push({ name, ids: [...ids] });
    } else {
      blocking.push({ name, severity: vuln.severity, ids: unexemptedIds });
    }
  }

  if (exempted.length > 0) {
    console.log('Exempted (documented in docs/security/npm-audit-exemptions.json):');
    for (const { name, ids } of exempted) {
      for (const id of ids) {
        const entry = exemptedIds.get(id);
        console.log(`  - ${name} ${id}: ${entry?.reason ?? '(no reason recorded)'}`);
      }
    }
    console.log('');
  }

  if (blocking.length > 0) {
    console.log('❌ Blocking (not exempted):');
    for (const { name, severity, ids } of blocking) {
      console.log(`  - ${name} [${severity}] ${ids.join(', ')}`);
    }
    console.log('');
    console.log(
      'Fix the vulnerability, or add a reviewed entry to docs/security/npm-audit-exemptions.json with a reason.'
    );
    process.exit(1);
  }

  console.log('✅ No non-exempted moderate+ vulnerabilities.');
  process.exit(0);
}

main();
