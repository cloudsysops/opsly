#!/usr/bin/env node
/**
 * Production change window gate (America/Bogota night).
 * Exit 0 = allowed; exit 1 = blocked.
 *
 * Usage:
 *   node scripts/ci/check-production-change-window.mjs --check-now
 *   node scripts/ci/check-production-change-window.mjs --check-now --grace-until-hour 9
 *   node scripts/ci/check-production-change-window.mjs --paths apps/peskids/x.ts docs/a.md
 *   node scripts/ci/check-production-change-window.mjs --mode deploy [--force]
 *   FORCE_DAYTIME=1 | HOTFIX_PROD=1 | SAFE_DAYTIME=1 | NIGHT_MERGE=1 (env overrides for CI)
 *   NIGHT_MERGE=1 only relaxes PR checks (queue for 01:00 bot); never deploy.
 *
 * --grace-until-hour <N> only widens --check-now's own window end to hour N
 * (America/Bogota, still exclusive). Scoped to --check-now alone — --paths and
 * --mode deploy always use the strict 22:00–06:00 window, unaffected. Exists
 * because GitHub Actions can delay a `schedule` trigger by hours under high
 * concurrent CI load (see #1548): the cron fires at exactly 01:00 Bogota, so a
 * late-but-same-night re-check of "are we still in a defensible window" is a
 * different question from "is this an arbitrary daytime request", which is
 * what the strict window exists to gate.
 */
'use strict';

const TIME_ZONE = 'America/Bogota';
const WINDOW_START_HOUR = 22; // inclusive
const WINDOW_END_HOUR = 6; // exclusive

/** Paths that require night window (or hotfix / safe-daytime label). */
const PROD_IMPACT_PREFIXES = [
  'apps/',
  'infra/',
  'supabase/',
  'packages/',
  'lib/',
];

const PROD_IMPACT_PATH_MATCHERS = [
  /^\.github\/workflows\/deploy/i,
  /^scripts\/.*deploy/i,
  /^scripts\/peskids/i,
  /^scripts\/vps-/i,
  /^scripts\/onboard-/i,
  /^package\.json$/,
  /^package-lock\.json$/,
];

/** If every changed path matches these, daytime merge is OK without labels. */
const SAFE_DAYTIME_MATCHERS = [
  /^docs\//,
  /^\.cursor\//,
  /^\.agents\//,
  /^skills\//,
  /^AGENTS\.md$/,
  /^VISION\.md$/,
  /^ROADMAP\.md$/,
  /^README\.md$/,
  /^SECURITY\.md$/,
  /^CONTRIBUTING\.md$/,
  /^CODE_OF_CONDUCT\.md$/,
  /^\.github\/(PULL_REQUEST_TEMPLATE|ISSUE_TEMPLATE|CODEOWNERS|copilot-instructions)/i,
  /^\.github\/AGENTS\.md$/,
  /\.md$/i,
];

export function bogotaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  return { hour, stamp: `${parts.year}-${parts.month}-${parts.day} ${String(hour).padStart(2, '0')}:xx ${TIME_ZONE}` };
}

export function isNightWindow(date = new Date(), endHour = WINDOW_END_HOUR) {
  const { hour } = bogotaParts(date);
  return hour >= WINDOW_START_HOUR || hour < endHour;
}

function normalizePath(p) {
  return String(p || '')
    .trim()
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

function isSafeDaytimePath(path) {
  const p = normalizePath(path);
  if (!p) return true;
  return SAFE_DAYTIME_MATCHERS.some((re) => re.test(p));
}

function isProdImpactPath(path) {
  const p = normalizePath(path);
  if (!p) return false;
  if (PROD_IMPACT_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  return PROD_IMPACT_PATH_MATCHERS.some((re) => re.test(p));
}

export function classifyPaths(paths) {
  const normalized = [...new Set(paths.map(normalizePath).filter(Boolean))];
  const prod = normalized.filter(isProdImpactPath);
  const unsafe = normalized.filter((p) => !isSafeDaytimePath(p));
  // Impact if any prod path OR any path not in the safe allowlist.
  const hasImpact = prod.length > 0 || unsafe.length > 0;
  return { normalized, prod, unsafe, hasImpact };
}

function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function parseArgs(argv) {
  const out = {
    checkNow: false,
    mode: 'pr',
    force: false,
    paths: [],
    graceUntilHour: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--check-now') out.checkNow = true;
    else if (a === '--force') out.force = true;
    else if (a === '--grace-until-hour') {
      const n = Number(argv[i + 1]);
      if (!Number.isInteger(n) || n < 0 || n > 23) {
        throw new Error(`--grace-until-hour must be an integer 0-23, got: ${argv[i + 1]}`);
      }
      out.graceUntilHour = n;
      i += 1;
    } else if (a === '--mode') {
      out.mode = argv[i + 1] || 'pr';
      i += 1;
    } else if (a === '--paths') {
      // remaining until next flag
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { stamp } = bogotaParts();
  const nightMergeQueued = truthy(process.env.NIGHT_MERGE);
  const force =
    args.force ||
    truthy(process.env.FORCE_DAYTIME) ||
    truthy(process.env.HOTFIX_PROD) ||
    truthy(process.env.SAFE_DAYTIME);

  if (args.checkNow) {
    const endHour = args.graceUntilHour ?? WINDOW_END_HOUR;
    const nightWithGrace = isNightWindow(new Date(), endHour);
    console.log(
      JSON.stringify(
        {
          timezone: TIME_ZONE,
          window: `${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00`,
          grace_window: args.graceUntilHour != null ? `${WINDOW_START_HOUR}:00–${endHour}:00` : null,
          now: stamp,
          in_night_window: nightWithGrace,
        },
        null,
        2
      )
    );
    process.exit(nightWithGrace ? 0 : 1);
  }

  const night = isNightWindow();

  if (args.mode === 'deploy') {
    if (night || force) {
      console.log(
        `ok deploy window (${stamp})${force && !night ? ' [forced daytime]' : ''}`
      );
      process.exit(0);
    }
    console.error(
      [
        `❌ Deploy bloqueado fuera de ventana nocturna (${TIME_ZONE} ${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00).`,
        `   Ahora: ${stamp}`,
        `   Reintentar después de las ${WINDOW_START_HOUR}:00, o workflow_dispatch con force_daytime=true / label hotfix-prod.`,
        `   Política: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`,
      ].join('\n')
    );
    process.exit(1);
  }

  // PR mode
  const { hasImpact, prod, unsafe, normalized } = classifyPaths(args.paths);
  if (!hasImpact) {
    console.log(`ok daytime-safe paths only (${normalized.length} files)`);
    process.exit(0);
  }

  if (night || force || nightMergeQueued) {
    const tag = nightMergeQueued && !night && !force
      ? ' [night-merge queue — merge deferred to 01:00 Bogotá]'
      : force && !night
        ? ' [label/force]'
        : '';
    console.log(
      `ok production-impact PR (${stamp})${tag} impact=${prod.length || unsafe.length}`
    );
    process.exit(0);
  }

  console.error(
    [
      `❌ Merge/deploy de impacto en producción bloqueado de día.`,
      `   Zona: ${TIME_ZONE} | Ventana permitida: ${WINDOW_START_HOUR}:00–${WINDOW_END_HOUR}:00 | Ahora: ${stamp}`,
      `   Paths de impacto (muestra): ${(prod.length ? prod : unsafe).slice(0, 12).join(', ')}`,
      `   Opciones:`,
      `   1) Label night-merge (CI verde de día; merge automático a la 01:00 Bogotá)`,
      `   2) Esperar a la noche y mergear entonces`,
      `   3) Label safe-daytime si el cambio NO afecta prod/ops`,
      `   4) Label hotfix-prod solo para emergencia`,
      `   Doc: docs/runbooks/PRODUCTION-CHANGE-WINDOW.md`,
    ].join('\n')
  );
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
