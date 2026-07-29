import fs from 'fs';

const EXEMPT_PACKAGES = new Set([
  'sharp',
  'next',
  'xlsx',
  'brace-expansion',
  'minimatch',
  'glob',
  'eslint',
  '@eslint/config-array',
  '@humanwhocodes/config-array',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  'cz-conventional-changelog',
  'commitizen',
  'rimraf',
  'flat-cache',
  'file-entry-cache'
]);

try {
  const data = JSON.parse(fs.readFileSync('audit-report.json', 'utf8'));
  const vulnerabilities = data.vulnerabilities || {};

  let failed = false;
  const activeUnexempted = [];

  for (const [pkgName, vuln] of Object.entries(vulnerabilities)) {
    const isModerateOrAbove = ['moderate', 'high', 'critical'].includes(vuln.severity);
    if (isModerateOrAbove && !EXEMPT_PACKAGES.has(pkgName)) {
      failed = true;
      activeUnexempted.push({ name: pkgName, severity: vuln.severity, via: vuln.via });
    }
  }

  if (failed) {
    console.error('❌ Security Audit Failed: Unexempted moderate+ vulnerabilities found!');
    console.error(JSON.stringify(activeUnexempted, null, 2));
    process.exit(1);
  } else {
    console.log('✅ Security Audit Passed (all moderate+ vulnerabilities are pre-approved/exempted)');
    process.exit(0);
  }
} catch (err) {
  console.error('Failed to parse or run audit filter:', err);
  process.exit(1);
}
