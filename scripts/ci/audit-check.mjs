#!/usr/bin/env node
/**
 * Custom NPM Audit checker that applies exemptions from docs/security/NPM-AUDIT-EXEMPTIONS.md.
 * Reads audit-report.json and exits 0 if all vulnerabilities are exempted.
 */
import fs from 'fs';
import path from 'path';

const REPORT_PATH = path.resolve('audit-report.json');
const EXEMPTIONS = ['xlsx', 'dompurify', 'undici'];

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('❌ Error: audit-report.json not found!');
    process.exit(1);
  }

  const raw = fs.readFileSync(REPORT_PATH, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('❌ Error: Failed to parse audit-report.json', err);
    process.exit(1);
  }

  // Handle npm audit error responses
  if (data.error) {
    console.error('❌ npm audit returned an error:', data.error.summary);
    process.exit(1);
  }

  const vulnerabilities = data.vulnerabilities || {};
  const vulnerablePackages = Object.keys(vulnerabilities);

  const activeVulnerabilities = vulnerablePackages.filter(
    (pkg) => !EXEMPTIONS.includes(pkg)
  );

  if (activeVulnerabilities.length > 0) {
    console.error(
      `❌ Failed: Found ${activeVulnerabilities.length} active (non-exempted) vulnerabilities:`
    );
    activeVulnerabilities.forEach((pkg) => {
      const vuln = vulnerabilities[pkg];
      console.error(`  - ${pkg}: ${vuln.severity} (${vuln.via.map((v) => v.title || v).join(', ')})`);
    });
    process.exit(1);
  }

  console.log('✅ Success: All audit vulnerabilities are exempted or resolved!');
  process.exit(0);
}

main();
