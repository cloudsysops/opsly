#!/usr/bin/env node
/**
 * Production change window + release-phase gate (America/Bogota night).
 * Exit 0 = allowed or skip; exit 1 = blocked.
 *
 * Usage:
 *   node scripts/ci/check-production-change-window.mjs --check-now
 *   node scripts/ci/check-production-change-window.mjs --mode pr --paths apps/x.ts
 *   node scripts/ci/check-production-change-window.mjs --mode staging
 *   node scripts/ci/check-production-change-window.mjs --mode promote [--event schedule]
 *   node scripts/ci/check-production-change-window.mjs --mode deploy [--force]
 *
 * Merge to main is not production. Production promotion stays fail-closed
 * outside 22:00–06:00 America/Bogota. Scheduled runs that land late SKIP (0).
 */
import {
  TIME_ZONE,
  WINDOW_START_HOUR,
  WINDOW_END_HOUR,
  PHASE,
  bogotaParts,
  isNightWindow,
  classifyPaths,
  truthy,
  evaluateReleaseAction,
} from './release-pipeline.mjs';

function parseArgs(argv) {
  const out = {
    checkNow: false,
    mode: 'pr',
    event: process.env.GITHUB_EVENT_NAME || 'workflow_dispatch',
    force: false,
    paths: [],
    rcSha: process.env.RC_SHA || '',
    productionSha: process.env.PRODUCTION_SHA || '',
    lastPromotedSha: process.env.LAST_PROMOTED_SHA || '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--check-now') out.checkNow = true;
    else if (a === '--force') out.force = true;
    else if (a === '--mode') {
      out.mode = argv[i + 1] || 'pr';
      i += 1;
    } else if (a === '--event') {
      out.event = argv[i + 1] || out.event;
      i += 1;
    } else if (a === '--paths') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        out.paths.push(argv[i + 1]);
        i += 1;
      }
    } else if (!a.startsWith('-')) {
      out.paths.push(a);
    }
  }
  return out;
}

function exitFromDecision(decision) {
  console.log(
    JSON.stringify(
      {
        action: decision.action,
        phase: decision.phase,
        in_window: decision.inWindow,
        now: decision.stamp,
        production_touched: decision.productionTouched,
        reason: decision.reason,
      },
      null,
      2
    )
  );
  process.exit(decision.exitCode);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const night = isNightWindow();
  const { stamp } = bogotaParts();
  const force =
    args.force ||
    truthy(process.env.FORCE_DAYTIME) ||
    truthy(process.env.HOTFIX_PROD) ||
    truthy(process.env.SAFE_DAYTIME);

  if (args.checkNow) {
    console.log(
      JSON.stringify(
        {
          timezone: TIME_ZONE,
          window: `${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00`,
          now: stamp,
          in_night_window: night,
        },
        null,
        2
      )
    );
    process.exit(night ? 0 : 1);
  }

  const mode = String(args.mode || 'pr').toLowerCase();

  if (mode === 'staging') {
    exitFromDecision(
      evaluateReleaseAction({
        phase: PHASE.STAGING,
        eventName: args.event,
        force,
      })
    );
  }

  if (mode === 'deploy' || mode === 'promote') {
    exitFromDecision(
      evaluateReleaseAction({
        phase: PHASE.PROMOTE,
        eventName: args.event,
        force,
        rcSha: args.rcSha,
        productionSha: args.productionSha,
        lastPromotedSha: args.lastPromotedSha,
      })
    );
  }

  // PR / merge: merge to main does not deploy production.
  const { hasImpact, prod, unsafe, normalized } = classifyPaths(args.paths);
  if (!hasImpact) {
    console.log(`ok daytime-safe paths only (${normalized.length} files)`);
    process.exit(0);
  }

  const decision = evaluateReleaseAction({
    phase: PHASE.MERGE,
    eventName: args.event,
    force,
    approvedPr: true,
    ciGreen: true,
  });
  const sample = (prod.length ? prod : unsafe).slice(0, 12).join(', ');
  console.log(
    `ok MERGE_TO_MAIN (${stamp}) merge≠production impact=${prod.length || unsafe.length} sample=${sample}`
  );
  process.exit(decision.exitCode);
}

main();
