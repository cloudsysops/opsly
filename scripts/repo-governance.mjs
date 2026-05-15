#!/usr/bin/env node
/**
 * Opsly repository governance CLI.
 * Usage:
 *   node scripts/repo-governance.mjs scan
 *   node scripts/repo-governance.mjs context-pack [--task "title"]
 *   node scripts/repo-governance.mjs validate-diff [--base main]
 *   node scripts/repo-governance.mjs pre-merge-report [--base main] [--json]
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

async function loadGovernance() {
  const mod = await import(join(REPO_ROOT, 'lib/repo-governance/dist/index.js'));
  return mod;
}

function gitDiff(base) {
  const numstat = execSync(`git diff --numstat ${base}...HEAD`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const nameStatus = execSync(`git diff --name-status ${base}...HEAD`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { numstat, nameStatus };
}

function parseArgs(argv) {
  const args = { base: 'main', task: '', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--base' && argv[i + 1]) {
      args.base = argv[++i];
    } else if (a === '--task' && argv[i + 1]) {
      args.task = argv[++i];
    } else if (a === '--json') {
      args.json = true;
    }
  }
  return args;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = parseArgs(rest);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(`Usage: node scripts/repo-governance.mjs <command>

Commands:
  scan                 Repo intelligence snapshot (JSON)
  context-pack         Markdown context pack for workers
  validate-diff          Architecture + budget check on git diff vs --base
  pre-merge-report     Full pre-merge report (markdown or --json)

Options:
  --base <branch>      Diff base (default: main)
  --task <title>       Task title for context pack / report
  --json               JSON output (pre-merge-report, validate-diff)
`);
    process.exit(cmd ? 0 : 1);
  }

  let gov;
  try {
    gov = await loadGovernance();
  } catch {
    console.error('Build lib/repo-governance first: npm run build --workspace=@intcloudsysops/repo-governance');
    process.exit(2);
  }

  if (cmd === 'scan') {
    const intel = await gov.buildRepoIntelligence(REPO_ROOT);
    console.log(JSON.stringify(intel, null, 2));
    return;
  }

  if (cmd === 'context-pack') {
    const md = await gov.generateContextPack(
      { task_title: opts.task || undefined },
      REPO_ROOT,
    );
    console.log(md);
    return;
  }

  if (cmd === 'validate-diff' || cmd === 'pre-merge-report') {
    let numstat = '';
    let nameStatus = '';
    try {
      ({ numstat, nameStatus } = gitDiff(opts.base));
    } catch (err) {
      console.error(`git diff failed (base=${opts.base}):`, err instanceof Error ? err.message : err);
      process.exit(2);
    }

    const changes = gov.mergeFileChanges(
      gov.parseNumstat(numstat),
      gov.parseNameStatus(nameStatus),
    );

    if (cmd === 'validate-diff') {
      const config = await gov.loadRepoGovernanceConfig(REPO_ROOT);
      const intel = await gov.buildRepoIntelligence(REPO_ROOT);
      const mergeRisk = gov.analyzeMergeRisk(changes, config, intel);
      const ok =
        mergeRisk.architecture_violations.filter((v) => v.severity === 'error').length === 0 &&
        mergeRisk.change_budget.within_budget;

      if (opts.json) {
        console.log(JSON.stringify({ ok, merge_risk: mergeRisk }, null, 2));
      } else {
        console.log(mergeRisk.summary);
        if (!ok) {
          for (const v of mergeRisk.architecture_violations) {
            if (v.severity === 'error') {
              console.error(`ERROR: ${v.message}`);
            }
          }
          for (const b of mergeRisk.change_budget.violations) {
            console.error(`BUDGET: ${b}`);
          }
        }
      }
      process.exit(ok ? 0 : 1);
    }

    const report = await gov.buildPreMergeReport(
      changes,
      { task_title: opts.task || undefined },
      REPO_ROOT,
    );

    if (opts.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(gov.formatPreMergeReportMarkdown(report));
    }

    if (report.human_approval_required) {
      process.exit(2);
    }
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
